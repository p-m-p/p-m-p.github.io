---
title: Custom elements in a world of JavaScript frameworks
description:
  React 19 shipped with long awaited support for custom HTML elements. Being the
  most popular of the JavaScript frameworks this development provides an
  opportunity to push for the adoption of web components in areas like design
  system component libraries. In this post I'll take a look at what is needed
  for adoption of web components across some of the major frameworks.
tags:
  - posts
  - web components
  - typescript
  - react
date: 2025-01-16
draft: true
---

## An argument for custom elements

Ignoring recent debate<sup>[1]</sup> around the usefulness of custom elements in
a world of component based JavaScript frameworks, you really can't deny that
they fit well as single use components like a carousel, share button, copy to
clipboard, code block etc. Develop these elements with a consistent API and
shared styling and they come together to create a component library or design
system, a copy to clipboard button inside the code block component for instance.

You can of course achieve similar results by focusing efforts on a JavaScript
framework, React, and in the past companies made this choice based on factors
like talent acquisition, technology trends and well, herd mentality. Before
version 19 React had limited support for custom elements and as the most popular
framework in the industry this influenced decisions around adoption in this
area&mdash;something I experienced first hand.

With React 19 I believe that we should build components, even if only the
primitives, with a platform first mindset using custom elements. Not
revolutionary thinking on my part, just observing this as a golden opportunity,
but I want to dig into this and see how to ensure we provide a first class
developer experience.

### A quick note on Angular, Vue and Svelte

The Angular, Vue, Svelte and other frameworks have long supported custom
elements with a component template syntax that utilises and extends standard
HTML. As per the tests on [custom elements
everywhere][custom-elements-everywhere] these frameworks provide support for
attribute/property binding and the handling of custom events.

### Changes to custom element handling in React 19

Before version 19 React had some limitations in using custom elements. In these
older version applying props to custom elements results in serializing the value
as a string and setting it as an attribute. This prevents the use of elements
with complex properties and results in the need for a proxy component around the
element to get and set the properties and also deal with applying the
`className` prop as the `class` attribute.

## Optimising the developer experience

Focusing on React as a framework, and ignoring fundamental aspects like
consistency and performance, let's run through what we expect from a component
library and how we can leverage it within a full stack environment like Next.js
or Remix.

### Type safety

As library authors we can't ignore TypeScript if we want to provide a rich user
experience. Well defined types help prevent misuse of components, enable auto
completion in the development workflow and aid with other forms of code
generation. Let's take a look at how to create custom element types for an
example card component.

```html
<my-card variant="tile">
  <h2 slot="title">Title</h2>
  <p slot="content">Card content</p>
  <a slot="action" href="/">Card action</a>
</my-card>
```

The element has a single attribute named `variant` with a matching property on
the underlying object class. The interface for this class extends `HTMLElement`
and defines the property with the available variants.

```ts
export interface CardElement extends HTMLElement {
  variant: "tile" | "section";
}
S;

export class Card implements CardElement {
  // ...class definition
}
```

To use the card element in a project with a framework that has both TypeScript
and JSX, type definitions for the elements in the JSX name space also need
defining. To do this for React, extend the `IntrinsicElements` interface and add
the custom element definitions. The module for defining these types depends on
the TypeScript configuration for the `jsx` compiler option.

Without these type definitions use of the element will result in a TypeScript
error about the unknown element.

```tsx
declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "my-card": DetailedHTMLProps<HTMLAttributes<CardElement>, CardElement> & {
        variant: CardElement["variant"];
      };
    }
  }
}
```

Immediately this looks complex and having to maintain these types by hand will
surely result in future issues. Instead we can automate the generation of these
types from a custom element manifest. The manifest format outlined [in this
project][custom-element-manifest] proposes a schema format for defining elements
for this purpose. As library authors we want to provide a manifest for the
components and we can automate this step with [this
analyzer][custom-element-analyzer] and generate the type definitions from the
generated manifest using [this plugin][cem-plugin] for the analyzer.

To generate editor extensions to use the custom elements with standard HTML
syntax, Burton Smith (GitHub user break-stuff) has also kindly provided plugins
for VS Code and JetBrains IDEs.

### Flexible bundling and loading options

### Server Side Rendering (SSR)

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[react]: https://react.dev/learn
[nextjs]: https://nextjs.org/docs/app/getting-started/installation
[use-client]: https://react.dev/reference/rsc/use-client
[matt-pocock]: https://www.mattpocock.com/
[github-discussion]:
  https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71395
[custom-element-manifest]:
  https://github.com/webcomponents/custom-elements-manifest
[custom-element-analyzer]: https://github.com/open-wc/custom-elements-manifest
[cem-plugin]:
  https://github.com/break-stuff/cem-tools/tree/main/packages/jsx-integration#readme
