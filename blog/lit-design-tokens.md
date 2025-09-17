---
title: Bundling type-safe design tokens for Lit web components
description:
  No doubt, Design Tokens are hard. I spent some time recently to create a build
  pipeline for a design system monorepo that provides bundling of design tokens
  for Lit web components developed with TypeScript. Here's what I ended up with.
tags:
  - posts
  - web components
  - design systems
  - lit
date: 2025-09-16
draft: true
---

## Pipeline requirements

The initial requirements for a build pipeline that generates CSS custom
properties for Lit elements:

1. Properties live in self contained component module and not in a root style
   sheet
1. Styles should all be in CSS and not require JavaScript changes to override.
1. Light and dark mode support via the `light-dark` CSS function
1. Properties are usable in Lit `css` tagged template literals without the need
   for `unsafeCSS`
1. Immediate feedback with failed builds for missing, misspelled or renamed
   tokens
1. Integrates with TypeScript tooling and IDEs to provide autocompletion
1. Documents properties for the component in the custom element manifest

## Token structure

This structure organizes tokens into three layers:

**Primitive** tokens include raw values like color tints, sizing and fonts.

**Global** tokens alias primitives and provide more semantic meaning such as
color types, spacing and typography.

**Components** tokens consume global tokens to define the styles for component
variants.

Take this basic example of a primitive token for the color green. The examples
use the Design Token Community Group format.

```json
{
  "color": {
    "$type": "color",
    "green": {
      "$value": "#00ff00"
    }
  }
}
```

The global layer references the green token as the primary color.

```json
{
  "color": {
    "$type": "color",
    "primary": {
      "$value": "{color.green}"
    }
  }
}
```

The component layer consumes the primary color token for the button background.

```json
{
  "button": {
    "background-color": {
      "$value": "{color.primary}"
    }
  }
}
```

Building the preceding tokens for the CSS platform with Style Dictionary using
the CSS variable format and output references, the output looks like this:

```css
:root {
  --color-green: #00ff00;
  --color-primary: var(--color-green);
  --button-background-color: var(--color-primary);
}
```

## Isolating component tokens

Isolating the tokens means that they only get included into the bundle when
using that component within an app. Tools exist to remove unused CSS during the
bundling phase but having the styles for a component local only to that module
or package helps to reduce bundling overhead and provides better separation of
concerns.

To isolate component tokens into their respective modules the Style Dictionary
configuration needs to reflect the token layers. Primitive and Global tokens get
bundled together in a root style sheet and components into individual files for
use in Lit.

You can filter out component properties so the root style sheet only contains
global styles using the file system path, an attribute on the token or perhaps
using a category. In the configuration below the components are in a separate
directory so the path removes them from the variables file.

```js
export default {
  source: ["primitives/**/*.json", "globals/**/*.json", "components/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: `dist/`,
      files: [
        {
          destination: "variables.css",
          format: "css/variables",
          options: {
            outputReferences: true,
          },
          // Filter out the components using the file path
          filter: (token) => !token.filePath.includes("components"),
        },
      ],
    },
  },
};
```

You can apply similar filters to generate the property files for the components.
If you generate the properties as CSS you could add them as an adopted style
sheet and referenced from the component styles but this doesn't provide a strong
link between the token and the component.

Take this example with the generated CSS for the button element.

```js
export default {
  source: ["primitives/**/*.json", "globals/**/*.json", "components/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: `dist/`,
      files: [
        {
          destination: "variables.css",
          format: "css/variables",
          options: {
            outputReferences: true,
          },
          // Filter out the components using the file path
          filter: (token) => !token.filePath.includes("components"),
        },
        {
          destination: "button.css",
          format: "css/variables",
          options: {
            outputReferences: true,
          },
          // Filter out the button component using the file path
          filter: (token) => token.filePath.includes("button"),
        },
      ],
    },
  },
};
```

```css
:host {
  --button-background-color: var(--color-primary);
}
```

Referencing the property from the element implementation works as expected but a
change to the name or removal of the token in the future would not cause any
failure at build time.

```js
export class Button extends LitElement {
  static styles = css`
    button {
      background-color: var(--button-background-color);
    }
  `;
}
```

By outputting the button properties as JavaScript this creates a strong link
between the component and the token. With a custom format function in the Style
Dictionary build you can output the properties as CSS but in JavaScript exports
to use in the component.

```js
export const props = css`
  :host {
    --button-background-color: var(--color-primary);
  }
`;

// export const backgroundColor = css`var(--button-background-color)`
```

In the component, add the props to the component styles and reference the
background color in the implementation styles.

```js
import * as styles from "./styles/button.js";

export class Button extends LitElement {
  static styles = [
    styles.props,
    css`
      button {
        background-color: ${styles.backgroundColor};
      }
    `,
  ];
}
```

Now any change to the token that's not also updated in the component
implementation breaks the build and provides fast feedback to developers.

To override the component styles, set the variables on the element in the
implemented app. Something like the below.

```css
ls-button {
  --button-background-color: red;
}
```

You can achieve a better developer experience by formatting the component tokens
with an alias and default value. Here's the button background again using this
approach.

```js
export const props = css`
  :host {
    --background-color: var(--button-background-color, --color-primary);
  }
`;

// export const backgroundColor = css`var(--background-color)`
```

Now you can define any overrides in the app root.

```css
:root {
  --button-background-color: red;
}
```

## Using the light-dark function for color schemes

To create light and dark themes each affected token requires two different
values. There's a few approaches on how to structure the tokens for this but no
recommended approach is currently provided by the tokens specification or Style
Dictionary.

Design tools like Figma Variables tend to have a full set of tokens for each
mode that export to separate token files. Unless I've missed some feature in
Style Dictionary, either you need to process the tokens before the build to
prevent name clashes or after to combine the values.

Take this token build script for light and dark tokens sets.

```js
// The list of components might come from a configuration file or a
// glob of the token JSON files
const components = ["button"];

for (const mode of ["light", "dark"]) {
  const sd = new StyleDictionary({
    source: [
      "primitives/**/*.json",
      "globals/**/*.json",
      `theme/${mode}/**/*.json`,
    ],
    platforms: {
      css: {
        transformGroup: "css",
        buildPath: `dist/${mode}`,
        files: [
          {
            destination: "variables.css",
            format: "css/variables",
            options: {
              outputReferences: true,
            },
            // Filter out the components using the file path
            filter: (token) => !token.filePath.includes("components"),
          },
          // Build the JavaScript Lit CSS exports for each component
          ...components.map((component) => ({
            destination: `${component}.js`,
            format: "javascript/litCSS",
            options: {
              outputReferences: true,
            },
            filter: (token) => token.filePath.includes(component),
          })),
        ],
      },
    },
  });

  await sd.buildAllPlatforms();
}
```

The build from Style Dictionary outputs two directories of tokens, one for light
and one for dark. From these built token exports this applies a simple pattern
match to combine differing light and dark values into the light-dark function.

```js
const light = await fs.readFile("dist/light/variables.css", "utf-8");
const dark = await fs.readFile("dist/dark/variables.css", "utf-8");

const propertiesPattern = /(--[^:]+?):\s*([^;]+?);/g;
const lightDark = {};

light.matchAll(propertiesPattern).forEach(([, prop, value]) => {
  lightDark[prop] = value;
});

dark.matchAll(propertiesPattern).forEach(([, prop, value]) => {
  if (!lightDark[prop]) {
    lightDark[prop] = value;
  } else if (lightDark[prop] !== value) {
    lightDark[prop] = `light-dark(${lightDark[prop]}, ${value})`;
  }
});

const content = `:root {
${Object.entries(lightDark)
  .map(([prop, value]) => `  ${prop}: ${value};`)
  .join("\n")}
}`;

await fs.writeFile("dist/variables.css", content, "utf-8");
```

You can apply a similar approach to the Lit CSS exports so the system generates
combined files at the root of the dist directory as package exports.
