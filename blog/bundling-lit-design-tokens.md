---
title: Bundling design tokens for Lit web components
description:
  Building a scalable design token pipeline for Lit components requires
  balancing automation with developer experience. Here's how to isolate
  component styles, generate type-safe tokens, and support light-dark themes
  with Style Dictionary.
tags:
  - posts
  - web components
  - design systems
  - lit
date: 2025-09-16
draft: true
---

## Pipeline structure and requirements

The build pipeline needs to carry styles from design tokens through to code in
Lit web components. Creating a system that automates the build process using
modern CSS features and providing a good developer experience with fast feedback
can quickly become a gnarly mess of configuration files and custom build
scripts.

Consider the following requirements:

- Isolation of CSS custom properties in the element module and not in a root
  style sheet
- Styles exist only in CSS and don't require JavaScript to apply customisation
- Light and dark mode support via the `light-dark` CSS function
- Properties work in Lit `css` template literals without the need for
  `unsafeCSS`
- Fast feedback loop with failed builds for any token changes not carried
  through to code
- Integration with TypeScript tooling and IDEs to provide autocompletion
- Documentation of element CSS properties in the custom element manifest

## Design token architecture

Organising tokens in three layers with primitive and alias tokens in the first
two layers and component tokens in the third, the first two layers get bundled
into a root CSS file and component tokens bundled separately for the component
modules.

Take this basic example of the three token layers to apply the background color
to a button.

```json
{
  "color": {
    "$type": "color",
    "$description": "This is the primitive green color palette",
    "green": {
      "500": {
        "$value": "#00ff00"
      }
    },
    "surface": {
      "action": {
        "$description": "A semantic color for action surfaces",
        "$value": "{color.green.500}"
      }
    }
  },
  "button": {
    "$description": "Button specific tokens",
    "background-color": {
      "$value": "{color.surface.action}"
    }
  }
}
```

Building these tokens with Style Dictionary using the default format for CSS
variables with output references, the output looks something like this:

```css
:root {
  --color-green-500: #00ff00;
  --color-surface-action: var(--color-green-500);
  --button-background-color: var(--color-surface-action);
}
```

This works, but the component tokens should live with the component and not in
the root style sheet.

## Isolating component tokens

Isolating the tokens means that they only get included into the bundle when
using that component within an app. Tools exist to remove unused CSS during the
bundling phase but having the styles for a component local only to that module
or package helps to reduce bundling overhead and provides better separation of
concerns.

To isolate component tokens into their respective modules the Style Dictionary
configuration needs to reflect the token layers.

To filter out component properties requires a function to match the tokens in
those layers. This example uses the file system path but it could apply to any
attribute of the token including extensions.

In the configuration below the components exist in a separate directory and a
check of the path removes them from the variables file.

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

Lit recommends using the static style prop for component styles for the best
performance. Generating the properties in CSS format doesn't align with this and
lacks a strong link between the token and the component implementation.

The component tokens need generating as JavaScript variables for use in the
static style property but this doesn't allow for customisation via CSS
properties. Tokens in ECMAScript module format require use of the unsafeCSS
function and hide the value from customisation through the global CSS
properties, something like the need to create a more dense theme by reducing
spacing variables in the global properties layer.

```js
import { LitElement, unsafeCSS } from "lit";
import { buttonBackgroundColor } from "styles/button.js";

export class Button extends LitElement {
  // Background color is generated as the raw color value #00ff00
  static styles = css`
    button {
      background-color: ${unsafeCSS(buttonBackgroundColor)};
    }
  `;
}
```

Finding a middle ground and generating the button properties as CSS string
exports from an ECMAScript module creates the strong link to the token while
maintaining the layering hierarchy.

Adding a custom format for Style Dictionary creates exports of the CSS
properties with individual variable exports for use in style declarations. The
format wraps each export with the `css` template string tag for use with Lit.

```js
import StyleDictionary from "style-dictionary";
import { propertyFormatNames, transforms } from "style-dictionary/enums";
import { formattedVariables } from "style-dictionary/utils";

StyleDictionary.registerFormat({
  name: "javascript/litCSS",
  format: ({ dictionary, options }) => {
    return [
      `import { css } from 'lit';`,
      // Generate all properties for the host element
      `export const props = css\`:host {\n${formattedVariables({
        format: propertyFormatNames.css,
        dictionary,
        outputReferences,
        usesDtcg: true,
      })}\n}\``,
      // Export js/CSS variable references for each property
      dictionary.allTokens.map((token) => {
        const nameCamel = StyleDictionary.hooks.transforms[
          transforms.nameCamel
        ].transform(token, options);
        const nameKebab = StyleDictionary.hooks.transforms[
          transforms.nameKebab
        ].transform(token, options);

        return `export const ${nameCamel} = css\`var(--${nameKebab})\``;
      }),
    ].join("\n\n");
  },
});
```

To add TypeScript definitions, a similar format can export the same variables
with the `CSSResultGroup` type from Lit or run the generated files through
TypeScript.

```js
import { css } from "lit";

// The props export contains the host selector with all of the component
// tokens with reference to the global tokens
export const props = css`
  :host {
    --button-background-color: var(--color-surface-action);
  }
`;

// Individual token exports
// export const backgroundColor = css`var(--button-background-color)`
```

In the component, add the props to the component styles and reference the
background color in the implementation.

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

Overriding the component styles requires setting the property value at the
element.

```css
my-button {
  --button-background-color: red;
}
```

To provide a better developer experience the format could provide the component
with unimplemented properties and an alias as default value.

```js
// --button-background-color is open for implementation
export const props = css`
  :host {
    --background-color: var(
      --button-background-color,
      var(--color-surface-action)
    );
  }
`;

// export const backgroundColor = css`var(--background-color)`
```

This makes it possible to override the properties at other levels such as the
app root.

```css
:root {
  --button-background-color: red;
}
```

## Using the light-dark function for color schemes

To create light and dark themes each token requires two different values. A few
approaches exist to structure the tokens for different color schemes but
currently no single approach exists in the token specification or Style
Dictionary.

Exporting tokens from design tools like Figma tends to result in a full set of
tokens for each mode. Processing these tokens with Style Dictionary results in
two independent builds to produce separate style sheets, one for light and one
for dark.

To combine separate style sheets into one with the `light-dark` syntax requires
a bit of post processing.

Here's the Style Dictionary build for the separate builds.

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

The resulting build has two directories, one for light and one for dark. A bit
of pattern matching merges the tokens with light and dark values into the
light-dark function to create a new variables style sheet.

```js
const light = await fs.readFile("dist/light/variables.css", "utf-8");
const dark = await fs.readFile("dist/dark/variables.css", "utf-8");

const propertiesPattern = /(--[^:]+?):\s*([^;]+?);/g;
const lightDark = {};

// Collect all light tokens
light.matchAll(propertiesPattern).forEach(([, prop, value]) => {
  lightDark[prop] = value;
});

// Collect all dark tokens updating any existing light values
// that differ into the light-dark() syntax
dark.matchAll(propertiesPattern).forEach(([, prop, value]) => {
  if (!lightDark[prop]) {
    lightDark[prop] = value;
  } else if (lightDark[prop] !== value) {
    lightDark[prop] = `light-dark(${lightDark[prop]}, ${value})`;
  }
});

// Create a new variables style sheet
const content = `:root {
${Object.entries(lightDark)
  .map(([prop, value]) => `  ${prop}: ${value};`)
  .join("\n")}
}`;
await fs.writeFile("dist/variables.css", content, "utf-8");
```

Applying a similar approach to the Lit exports files for each component results
in a single set of exports for both color schemes.

## Documenting component properties

Using the custom elements manifest tooling you can generate component
documentation. Including the CSS custom properties in the manifest requires
JSDoc comments for each component.

Rather than maintain these manually the manifest build can look up the component
in tokens file and add them to the manifest using a plugin for the custom
element manifest analyzer.

```json
{
  "schemaVersion": "1.0.0",
  "modules": [
    {
      "kind": "javascript-module",
      "path": "src/Button.ts",
      "declarations": [
        {
          "kind": "class",
          "description": "Button element.",
          "name": "Button",
          "superclass": {
            "name": "LitElement",
            "package": "lit"
          },
          "tagName": "my-button",
          "customElement": true,
          "cssProperties": [
            {
              "name": "--button-background-color",
              "description": "Button background color",
              "default": "#00ff00"
            }
          ]
        }
      ],
      "exports": [
        {
          "kind": "js",
          "name": "Button",
          "declaration": {
            "name": "Button",
            "module": "src/Button.ts"
          }
        },
        {
          "kind": "custom-element-definition",
          "name": "my-button",
          "declaration": {
            "name": "Button",
            "module": "src/Button.ts"
          }
        }
      ]
    }
  ]
}
```
