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
1. Light and dark mode support using the `light-dark` CSS function
1. Properties are usable in Lit's `css` tagged template literals without the
   need for `unsafeCSS`
1. Immediate feedback with failed builds for missing, misspelled or renamed
   tokens
1. Integrates with TypeScript tooling and IDEs to provide autocompletion
1. Documents properties for the component in the custom element manifest

## Token structure

Tokens are structured into three layers:

**Primitive** tokens include raw values like color tints, sizing and fonts.

**Global** tokens alias primitives and provide more semantic meaning such as
color types, spacing and typography, .

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

When building the preceding tokens for the CSS platform with Style Dictionary
using the variables format and output references, the output looks like this:

```css
:root {
  --color-green: #00ff00;
  --color-primary: var(--color-green);
  --button-background-color: var(--color-primary);
}
```

## Isolating component tokens

To isolate component tokens into their respective modules the Style Dictionary
configuration needs to reflect the token layers. Primitive and Global tokens get
bundled together in a root style sheet and components into individual files.
