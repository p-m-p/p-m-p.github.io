---
title: Generating entry points for TypeScript packages
description:
  Consuming NPM packages that export JavaScript Modules (ESM) with bundlers like
  Vite and Webpack is simple enough but to author a package in TypeScript with
  ESM only exports there's a few things that need to be considered.
tags:
  - posts
  - web
  - nodejs
  - typescript
date: 2024-10-27
social_card: typescript-package-entry-points.jpg
---

## TypeScript vs JavaScript module resolution

TypeScript generally has the same import syntax as [JavaScript
modules][javascript-modules] with additional features from CommonJS that aren't
supported in JavaScript modules.

Take this basic example of a library module structure.

```shell
.
├── package.json
├── src
│   ├── feature
│   │   ├── Component.ts
│   │   └── index.ts
│   └── index.ts
└── tsconfig.json
```

With TypeScript it's possible to import from the directory via it's index file
or from another file without the extension.

```ts
import { Component } from "./feature";
import Component from "./feature/Component";
```

JavaScript modules require the full path and the file extension.

```js
import { Component } from "./feature/index.js";
import Component from "./feature/Component.js";
```

To export JavaScript modules from the compiled TypeScript all import statements
need to use the ESM syntax. To do this the TypeScript configuration option for
`module` needs to be set to `nodenext` as does `moduleResolution` (see [Module
resolution for libraries][module-resolution]).

You'd be easily mistaken here to think that compiling with other module settings
work fine when consuming the library with a bundler that doesn't apply the
strict ESM resolution algorithm but when used with Node.js it will result in
module import errors.

Here's an example of a minimal TypeScript configuration for compiling to
JavaScript modules.

```json
{
  "compilerOptions": {
    "esModuleInterop": false,
    "lib": ["node"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "esnext"
  }
}
```

It seems weird importing `.ts` and `.tsx` files with a `.js` extension, and
there are other ways to fix the import paths via plugins for bundlers like
ESBuild and Rollup, but it does at least make the intent explicit.

## Packaging library modules

A common solution for exposing library modules is to use a bundler to create a
single entry point. This is fine, and possibly even preferred, for small
packages but on a larger scale for packages with many modules exporting them
individually will help to reduce unused JavaScript and optimise build
performance through [tree shaking][tree-shaking].

### Build options

If the compiled JavaScript files are relative to package.json they could be
imported from the file system path.

```js
import { Component } from "myLib/feature/index.js";
```

It can get messy with this approach, having the compiled files strewn across the
project during development. Some of this can be overcome with [Git
ignore][git-ignore] rules and use of the [files configuration][npm-files] in
package.json but it also means a key advantage of the module pattern is lost,
[information hiding][information-hiding].

Node.js modules are able to provide a map of
[package entry points](entry-points) in package.json to expose only the public
modules. When using this approach the compiled JavaScript modules can be output
to a separate build directory.

Here's an example package.json with entry points for the JavaScript modules
compiled to a directory named `dist`.

```json
{
  "name": "myLib",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": "./dist/index.js",
    "./feature": "./dist/feature/index.js"
  }
}
```

Now it's possible to import the package modules from the named entry points,
noticeably without the file name and extension.

```js
import { ComponentA } from "myLib/componentA";
```

### Automated entry point generation

Maintaining the entry points manually will be a burden that likely becomes a
source of errors with keeping things in sync. Automating the generation of the
package entry points removes this risk but presents a new problem, the need to
update package.json.

Generating the entry points and updating package.json could run as a
[prepublish][pre-post-scripts] phase, a [pre-commit hook][pre-commit-hook] or on
a build server. Given there is a separate `dist` directory another approach is
to create a package.json in that directory and publish the package from there.

This Node.js script generates the entry points and writes a new package.json
file in the `dist` directory. All public modules under the `src` directory
contain an `index.ts` file and this is used as the entry point.

```js
// generateExports.js
import { copyFile, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { glob } from "glob"; // npm install -D glob

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

  exports[exportPath] = {
    types: `${exportPath}/index.d.ts`,
    import: `${exportPath}/index.js`,
  };
}

// Write the published package.json into the dist directory
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

This script can be run during the build and publishing of the library.
Everything in the `dist` directory can be ignored from source control and now
there's no risk of forgetting to update the entry points or exposing library
internals that may be subject to change in the future.

[javascript-modules]:
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
[module-resolution]:
  https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution-for-libraries
[tree-shaking]: https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking
[information-hiding]: https://en.wikipedia.org/wiki/Information_hiding
[entry-points]: https://en.wikipedia.org/wiki/Information_hiding
[pre-post-scripts]:
  https://docs.npmjs.com/cli/v9/using-npm/scripts#pre--post-scripts
[pre-commit-hook]: https://git-scm.com/book/ms/v2/Customizing-Git-Git-Hooks
[git-ignore]: https://git-scm.com/docs/gitignore
[npm-files]: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
