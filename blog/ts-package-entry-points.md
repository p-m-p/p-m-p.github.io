---
title: Generating package entry points for TypeScript libraries
tags:
  - posts
date: 2024-09-15
draft: true
---

Consuming NPM packages that export [JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
(ESM) in a TypeScript application is easy enough with bundlers like Vite or Webpack but authoring ESM only packages in
TypeScript has a few quirks that need to be considered.

## TypeScript vs JavaScript module resolution

TypeScript has the same import syntax as JavaScript modules with additional support for features from CommonJS. Importing a file
and omitting the extension or importing from a directory that contains an index file (index.js, index.ts etc) works fine in
TypeScript but is not possible with JavaScript module imports.

Take this simple example of a library project structure.

```shell
src
├── componentA
│   ├── ComponentA.ts
│   ├── serviceA.ts
│   └── index.ts
├── componentB
│   ├── ComponentB.ts
│   ├── serviceB.ts
│   └── index.ts
├── core
│   └── utils.ts
└── index.ts
```

With TypeScript it's possible to import from the directory index or file without extension.

```ts
import { ComponentA } from "./componentA";
import { utils } from "./core/utils";
```

JavaScript modules require the full path and the file extension.

```js
import { ComponentA } from "./componentA/index.js";
import { utils } from "./core/utils.js";
```

To export JavaScript modules from the package we'll need to use the correct syntax internally. To do this the
TypeScript configuration option for `module` needs to be set to `nodenext` as does `moduleResolution` (see
[Module resolution for libraries](https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution-for-libraries)).

You'd be easily mistaken here to think that compiling with other module settings like `bundler` work when using the
library with a bundler that doesn't apply the strict ESM resolution algorithm.

```json
{
  "compilerOptions": {
    "esModuleInterop": false,
    "lib": ["node", "dom", "dom.iterable"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "esnext"
  }
}
```

Now it's necessary to follow the JavaScript module syntax within the TypeScript files and include the file path with
the extension. This does feel a little weird and there is ways to fix the paths with plugins for bundlers like ESBuild
or Rollup but this way does at least make the intent explicit.

## Build and bundling options

We could avoid the need for named exports by using a bundler to create a single entry point for all of the library. This might
be fine for small packages but on the larger scale for packages like a component library it's better to expose individual
modules so that consumers can import only th the ones they use. This will help to reduce unused JavaScript and optimise tree
shaking within their own projects.

One approach to the build and bundling is to compile the JavaScript files and have consumers import from the destination path.
Let's say the files are output to a directory named `dist` the import statemennt may look something like:

```js
import { ComponentA } from "myLib/dist/componentA/index.js";
```

Although simple, with this we lose a key advantage of modules that is information hiding. We rely entirely on the file system
structure and will be constrained by this in any future changes to the package.

For Node.js modules (NPM packages) we can list [package entry points](https://nodejs.org/api/packages.html#package-entry-points)
in package.json to expose only the public modules of our library.

```json
{
  "name": "myLib",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": "./dist/index.js"
    "./componentA": "./dist/componentA/index.js"
    "./componentB": "./dist/componentB/index.js"
  }
}
```

Now consumers import the package modules from the named entry points.

```js
import { ComponentA } from 'myLib/componentA'
```

Maintaining these entry points manually introduces risk of errors with keeping things in sync when adding or removing modules.
To overcome this a simple strategy can be used to automatically generate the entry points.

### Automated entry point generation

Automating the generation of the package entry points removes the risk of error but does present a new problem, we need to
update package.json. This generation could run pre-commit but it's more likely that this will be part of a build and
publishing phase. Rather than update the existing package.json file a we will create new one within the dist directory
alongside the compiled JavaScript modules and publish our package from there.

Let's look at a simple script `generateExports.js` that generates the entry points and writes a new package.json file.

```js
import { copyFile, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { glob } from "glob";

// Assumes the script is in the project root and the TypeScript
// files have been compiled into a directory named dist
const root = import.meta.dirname;
const dist = join(root, "dist");

// Read package.json from the project root
const packageJson = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);

// Extend any manually added named exports
const exports = { ...packageJson.exports };

// Search for all index files in src directory and add
// named exports for the generated types and imports
for (const index of await glob("src/**/index.ts")) {
  const exportPath = index.replace(/^src(.*?)\/[^/]+$/, ".$1");
  const distPath = index.replace(/^src(.*?\/)[^/]+$/, "./dist$1");

  exports[exportPath] = {
    types: `${distPath}index.d.ts`,
    import: `${distPath}index.js`,
  };
}

// Write the package.json for publishing into the dist directory
await writeFile(
  join(dist, "package.json"),
  JSON.stringify(
    {
      ...packageJson,
      exports,
    },
    null,
    2,
  ),
  "utf8",
);

// Copy other files required in the published package
for (const file of ["README.md", "LICENCE"]) {
  await copyFile(join(root, file), join(dist, file));
}
```

The build and publishing phase might have something like the following steps.

```sh
npm run build # Runs tsc, esbuild, tsup, etc
node ./generateExports.js # Create exports and package.json in dist

# Publish package from dist directory
cd ./dist
npm publish
```


