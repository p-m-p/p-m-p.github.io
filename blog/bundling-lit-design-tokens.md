---
title: Bundling design tokens for Lit web components
description:
  Building a design token pipeline that keeps component styles isolated and
  supports light-dark color schemes requires a balance in automation and
  developer experience. This post demonstrates a Style Dictionary approach that
  exports JavaScript tokens for Lit while maintaining the flexibility of CSS.
tags:
  - posts
  - web components
  - design systems
  - lit
date: 2025-09-21
---

## Pipeline structure and requirements

The [Style Dictionary][style-dictionary] build transforms styles from design
tokens in [JSON format][dtcg] through to code for use in [Lit][lit] web
components. The library comes with built in formats to generate tokens for
different platforms but there doesn't yet seem to be a standard approach for
combining light and dark color schemes into a single set of tokens that use the
[`light-dark`][light-dark] CSS function.

It is possible to create a system that automates the build process to use this
modern CSS feature thanks to the flexible API that Style Dictionary provides.
Here's one approach that combines CSS and JavaScript to provide CSS tokens for
use in Lit components.

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

For this example the design tokens are organized into [three
tiers][three-tier-tokens]. The first two tiers contain primitive and semantic
tokens, while the third tier contains component tokens. The build process
bundles the first two layers into a root CSS file for inclusion in the app root
and bundles component tokens separately for their respective component modules.

Here's a basic example showing how the three token tiers work together to apply
a background color to a button. In most cases the light and dark variants of a
token exist in the theme tier but they may also appear in components.

```json
{
  "color": {
    "$type": "color",
    "$description": "This is the color palette definitions",
    "brand": {
      "green": {
        "$value": "#00ff00"
      }
    }
  },

  "theme": {
    "color": {
      "$type": "color",
      "$description": "Theme color tokens alias the definitions",
      "primary": {
        "background": {
          "$value": "{color.brand.green}"
        }
      }
    }
  },

  "button": {
    "$description": "Component tokens for the button element reference the theme",
    "primary": {
      "background": {
        "$type": "color",
        "$value": "{theme.color.primary.background}"
      }
    }
  }
}
```

Building these tokens with Style Dictionary using the default format for CSS
variables using output references, the generated output looks like this:

```css
:root {
  --color-brand-green: #00ff00;
  --theme-color-primary-background: var(--color-brand-green);
  --button-primary-background: var(--theme-color-primary-background);
}
```

## Isolating component tokens

Isolating the component tokens means they only get bundled or loaded when using
that component within an app. While tools exist to remove unused CSS during the
bundling phase, keeping component styles local to their module or package helps
reduce overhead and provides better separation of concerns.

To achieve this isolation the Style Dictionary build configuration needs to
respect the three token tiers. Filtering the component properties out of the
root style sheet requires a function to include only the tokens in those tiers.

This example uses the file system path, but this approach could apply to any
token attribute, including [extensions][dtcg-extensions]. The components exist
in a separate directory, and a path check removes them from the root variables
file:

```js
import StyleDictionary from "style-dictionary";

const sd = new StyleDictionary({
  source: ["definitions/**/*.json", "theme/**/*.json", "components/**/*.json"],
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
          // Filter out the components using the token file path
          filter: (token) => !token.filePath.includes("components"),
        },
      ],
    },
  },
});
```

## Applying tokens to components

Lit recommends [using the static style prop][lit-styles] for component styles to
achieve the best performance. Generating properties in CSS format doesn't align
with this recommendation and lacks a strong link between the token and the
component implementation.

Generating tokens in ECMAScript module format for use with Lit require the
[`unsafeCSS`][lit-unsafecss] function and prevents customization through CSS
properties.

```js
import { LitElement, css, unsafeCSS } from "lit";
import { primaryBackground } from "styles/button.js";

export class Button extends LitElement {
  // Background color is generated as the raw color value #00ff00
  static styles = css`
    button {
      background-color: ${unsafeCSS(primaryBackground)};
    }
  `;
}
```

A better approach is generating button properties as CSS string exports from an
ECMAScript module. This creates a strong link to the token while keeping CSS as
the source of truth for styling.

Adding a custom format for Style Dictionary creates an export of all CSS
properties with individual exports for use in style declarations. The format
wraps each export with the `css` template string tag for use with Lit.

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
        outputReferences: true,
        usesDtcg: true,
      })}\n}\`;`,
      // Export js/CSS variable references for each property
      dictionary.allTokens.map((token) => {
        // Remove the component name from the JS variable for cleaner exports
        const [, ...path] = token.path;
        const nameCamel = StyleDictionary.hooks.transforms[
          transforms.nameCamel
        ].transform({ ...token, path }, options);
        const nameKebab = StyleDictionary.hooks.transforms[
          transforms.nameKebab
        ].transform(token, options);

        return `export const ${nameCamel} = css\`var(--${nameKebab})\`;`;
      }),
    ].join("\n\n");
  },
});
```

Save the files as JavaScript or TypeScript resulting in a module like this for
the button element.

```js
import { css } from "lit";

// The props export contains the host selector with all of the component properties
export const props = css`
  :host {
    --button-primary-background: var(--theme-color-primary-background);
  }
`;

// Individual token exports
export const primaryBackground = css`var(--button-primary-background)`;
```

In the component, add the props to the component styles and reference them in
the component styles implementation:

```js
import { props, primaryBackground } from "./styles/button.js";

export class Button extends LitElement {
  static styles = [
    props,
    css`
      .primary {
        background-color: ${primaryBackground};
      }
    `,
  ];
}
```

To override the component styles, set the property value at the element.

```css
my-button {
  --button-primary-background: red;
}
```

To provide a better developer experience, the format can provide the component
with unimplemented properties with an alias as the default value.

```js
import { css } from "lit";

// --button-primary-background is open for implementation
export const props = css`
  :host {
    --primary-background: var(
      --button-primary-background,
      var(--theme-color-primary-background)
    );
  }
`;

export const primaryBackground = css`var(--primary-background)`;
```

This makes it possible to override the properties at other levels, such as the
app root.

```css
:root {
  --button-primary-background: red;
}
```

## Using the light-dark function for color schemes

To create light and dark themes, each token requires two different values. A few
approaches exist to structure tokens for different color schemes, but currently
no standardized approach exists in the [token specification][dtcg] or Style
Dictionary.

Exporting tokens from design tools like Figma or [Tokens Studio][tokens-studio]
tends to result in a full set of tokens for each mode at the theme and component
tiers. Processing these tokens with Style Dictionary requires two independent
builds to produce separate style sheets: one for light and one for dark.

To combine the separate style sheets into one with the `light-dark` syntax
requires some post-processing.

Here's a Style Dictionary build script that creates the separate builds:

```js
// The list of components might come from a configuration file or a
// glob of the token JSON files
const components = ["button"];

for (const mode of ["light", "dark"]) {
  const sd = new StyleDictionary({
    source: [
      "definitions/**/*.json",
      `theme/${mode}/**/*.json`,
      `components/${mode}/**/*.json`,
    ],
    platforms: {
      css: {
        transformGroup: "css",
        buildPath: `dist/${mode}/`,
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
          // Build the JavaScript Lit CSS exports for each component as .ts
          ...components.map((component) => ({
            destination: `${component}.ts`,
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

This approach creates two directories, one for light and one for dark. Using
pattern matching in a post build script merges the tokens with light and dark
values into the light-dark function syntax to create a new variables style
sheet.

```js
const light = await fs.readFile("dist/light/variables.css", "utf-8");
const dark = await fs.readFile("dist/dark/variables.css", "utf-8");

// Matches css properties like --them-color-primary-background
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

Applying a similar approach to the ECMAScript files for each component results
in a single set of exports that works for both color schemes.

## Automating CSS property documentation

Using the [custom elements manifest][cem] tooling, you can generate component
documentation. Including the CSS custom properties in the manifest requires JS
Doc `@cssproperty` tags, but rather than maintain these manually, the manifest
build can look up the component in a tokens file and add them to the manifest
using a plugin.

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

## Build failures deliver fast feedback

Feedback from [visual regression testing][visual-testing] requires more time,
tooling, and potential cost overhead than build pipeline failures that deliver
more immediate feedback to developers.

This approach provides fast feedback and offers other benefits, such as
flexibility in property naming (including changing the token prefix) and
preventing unused or unimplemented variables from accumulating in the codebase.

Check out this [brief example][stackblitz] for some working code and [this
repository][lime-soda] for a design system integration.

[cem]: https://custom-elements-manifest.open-wc.org/analyzer/getting-started/
[dtcg]: https://www.designtokens.org/tr/drafts/
[dtcg-extensions]: https://www.designtokens.org/tr/drafts/format/#extensions
[light-dark]:
  https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
[lime-soda]: https://github.com/lime-soda/web-components
[lit]: https://lit.dev/
[lit-styles]: https://lit.dev/docs/components/styles/
[lit-unsafecss]: https://lit.dev/docs/api/styles/#unsafeCSS
[stackblitz]:
  https://stackblitz.com/edit/vitejs-vite-w8jtdtqu?file=src%2Fmy-button.ts
[style-dictionary]: https://styledictionary.com/
[three-tier-tokens]:
  https://bradfrost.com/blog/post/creating-themeable-design-systems/
[tokens-studio]: https://tokens.studio/
[visual-testing]: https://www.browserstack.com/percy/visual-regression-testing
