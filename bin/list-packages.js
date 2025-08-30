#!/usr/bin/env node
// list-packages.js
// Scans ./node_modules, keeps only deps from root package.json,
// unique by default (closest to root), prints a no-quotes table,
// then a JSON excerpt to replace deps/devDeps.

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const ROOT = process.cwd();
const ROOT_PKG = path.join(ROOT, "package.json");
const NODE_MODULES = path.join(ROOT, "node_modules");

function depthOf(p) {
  return p.split(path.sep).length;
}

async function readJSON(file) {
  const data = await fsp.readFile(file, "utf8");
  return JSON.parse(data);
}

async function* walkForPackageJson(dir) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        const base = ent.name.toLowerCase();
        if (base === ".git" || base === ".cache") continue;
        stack.push(full);
      } else if (ent.isFile() && ent.name === "package.json") {
        yield full;
      }
    }
  }
}

async function collectInstalledVersions(baseDir, wantedNames) {
  // Map: name -> { version, file, depth }
  const seen = new Map();

  for await (const pkgJsonPath of walkForPackageJson(baseDir)) {
    let pkg;
    try {
      pkg = JSON.parse(await fsp.readFile(pkgJsonPath, "utf8"));
    } catch {
      continue;
    }
    const name = typeof pkg.name === "string" ? pkg.name : null;
    const version = typeof pkg.version === "string" ? pkg.version : null;
    if (!name || !version) continue;
    if (!wantedNames.has(name)) continue;

    const d = depthOf(pkgJsonPath);
    const prev = seen.get(name);
    // Unique by default: prefer shallower (closer to root)
    if (!prev || d < prev.depth) {
      seen.set(name, { name, version, file: pkgJsonPath, depth: d });
    }
  }

  return seen;
}

function printTable(rows) {
  const headers = ["name", "version"];
  const nameWidth = Math.max(
    headers[0].length,
    ...rows.map((r) => r.name.length)
  );
  const verWidth = Math.max(
    headers[1].length,
    ...rows.map((r) => r.version.length)
  );

  const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));
  const line =
    pad(headers[0], nameWidth) + "  " + pad(headers[1], verWidth);

  const sep =
    "-".repeat(nameWidth) + "  " + "-".repeat(verWidth);

  console.log(line);
  console.log(sep);
  for (const r of rows) {
    // print raw text (no quotes)
    console.log(pad(r.name, nameWidth) + "  " + pad(r.version, verWidth));
  }
}

(async () => {
  // Sanity checks
  try {
    const st = await fsp.stat(NODE_MODULES);
    if (!st.isDirectory()) throw new Error("node_modules is not a directory");
  } catch {
    console.error("❌ node_modules not found in current directory.");
    process.exit(1);
  }

  let rootPkg;
  try {
    rootPkg = await readJSON(ROOT_PKG);
  } catch (e) {
    console.error("❌ Could not read ./package.json:", e.message || e);
    process.exit(1);
  }

  const rootDeps = { ...(rootPkg.dependencies || {}) };
  const rootDevDeps = { ...(rootPkg.devDependencies || {}) };
  const wantedNames = new Set([
    ...Object.keys(rootDeps),
    ...Object.keys(rootDevDeps),
  ]);

  if (wantedNames.size === 0) {
    console.log("No dependencies/devDependencies declared in package.json.");
    process.exit(0);
  }

  const installedMap = await collectInstalledVersions(NODE_MODULES, wantedNames);

  const rows = [];
  const newDeps = {};
  const newDevDeps = {};
  const missing = [];

  const entries = [
    ...Object.keys(rootDeps).map((n) => ({ name: n, kind: "dep" })),
    ...Object.keys(rootDevDeps).map((n) => ({ name: n, kind: "dev" })),
  ].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  for (const { name, kind } of entries) {
    const found = installedMap.get(name);
    if (found) {
      rows.push({ name, version: found.version });
      if (kind === "dep") newDeps[name] = found.version;
      else newDevDeps[name] = found.version;
    } else {
      missing.push(name);
    }
  }

  if (rows.length === 0) {
    console.log("No matching installed packages were found in node_modules.");
    if (missing.length) {
      console.log("\nMissing (declared but not found):");
      for (const n of missing) console.log(" -", n);
    }
    process.exit(0);
  }

  // Print table with no quotes (even for scoped packages like @angular/*)
  printTable(rows);

  // JSON excerpt (must have quotes to be valid JSON)
  const excerpt = {
    dependencies: newDeps,
    devDependencies: newDevDeps,
  };
  console.log("\n// --- Paste into your package.json ---");
  console.log(JSON.stringify(excerpt, null, 2));

  if (missing.length) {
    console.log("\n// Declared but not found in node_modules:");
    for (const n of missing) console.log(`// - ${n}`);
  }
})();