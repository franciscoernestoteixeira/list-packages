# show-packages

A simple CLI tool to list the **installed dependencies** and **devDependencies** of a Node.js project with their **actual installed versions** (from `node_modules`).  

It outputs:
- A table
- A JSON excerpt you can paste back into your `package.json`

---

## Installation

```bash
npm install -g show-packages
```

---

## Usage

From the root of any Node.js project that has a `package.json` and a `node_modules` folder:

```bash
show-packages
```

---

## Example

Suppose your `package.json` has:

```json
{
  "dependencies": {
    "@angular/core": "^20.0.0",
    "express": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

and your `node_modules` actually contains:

- `@angular/core@20.1.7`
- `express@4.19.2`
- `typescript@5.5.4`

Running:

```bash
show-packages
```

### Output

#### Table

```
name           version
-------------- --------
@angular/core  20.1.7
express        4.19.2
typescript     5.5.4
```

#### JSON Excerpt

```json
// --- Paste into your package.json ---
{
  "dependencies": {
    "@angular/core": "20.1.7",
    "express": "4.19.2"
  },
  "devDependencies": {
    "typescript": "5.5.4"
  }
}
```

---

## Why?

When maintaining projects, `package.json` often lists **ranges** (like `^4.0.0`), but you may need to lock to the **exact installed versions**.  
This tool reads `node_modules/**/package.json` and matches only what you declared in your project’s root `package.json`.

---

## Features

- Lists **only declared dependencies** (`dependencies` and `devDependencies`)
- Uses the **closest installed version** (deduped automatically)
- Outputs a table
- Prints a JSON excerpt ready to paste into your `package.json`
- Zero configuration — just run it

---


## How to publish in NPM

1. Create an account in https://www.npmjs.com/signup.

2. At terminal:

```bash
npm login
```

3. Publish it:

```bash
npm publish --access public
```

---

## License

MIT © [Francisco Ernesto Teixeira](https://github.com/franciscoernestoteixeira)
