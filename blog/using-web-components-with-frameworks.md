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
the custom element definitions. The module in which these types exist depends on
the TypeScript configuration for the `jsx` compiler option so need adding for
each (`react`, `react/jsx-runtime` etc).

Without these type definitions use of the element will result in a TypeScript
error about the unknown element.

```tsx
declare module "react" {
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
surely result in headaches down the line. Instead, we should automate the
generation of these types from a custom element manifest as outlined [in this
project][custom-element-manifest] that defines a schema format for this purpose.

To provide both a manifest and type definitions for out components we can use
[this analyzer][custom-element-analyzer] to generate the manifest and feed that
to [this plugin][cem-plugin] to generate the types. The analyzer will surface
the attributes, properties and custom events but may require a bit of finessing
with JSDoc comments to describe them.

To generate editor extensions for using the custom elements with standard HTML
syntax, GitHub user break-stuff (Burton Smith) has also kindly provided plugins
for VS Code and JetBrains IDEs.

### Flexible bundling and loading options

JavaScript for the library elements needs to either load independently in the
document or get bundled with the rest of the application code. To support either
scenario the library can export the unregistered element class and expose a
module with the element registered. If we want to try and maintain control of
the element names we can supply a method on or with the class to register the
element.

```ts
// class exported as @ds/my-element/MyElement
// defined element exported as @ds/my-element
export class MyElement extends HTMLElement {
  static register(tagName = "my-element") {
    customElements.define(tagName, this);
  }
}
```

Application developers who want finer control over code bundling can import the
class and register it where required. See this article I wrote on how to
generate named exports for library files.

```ts
import { MyElement } from "@ds/my-element/MyElement";

MyElement.register();
```

Each component gets exported both ways from the library as either a separate
package or module in a single package to install with a package manager or
import from a CDN. This approach works for single page applications but to
support server rendering in some of the latest meta frameworks we need to ensure
the browser only code doesn't get loaded in the server environment.

### Server Side Rendering (SSR)

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[custom-element-manifest]:
  https://github.com/webcomponents/custom-elements-manifest
[custom-element-analyzer]: https://github.com/open-wc/custom-elements-manifest
[cem-plugin]:
  https://github.com/break-stuff/cem-tools/tree/main/packages/jsx-integration#readme
