---
title: A place for custom elements in a world of JavaScript frameworks
description:
  Last year, React 19 shipped with full support for custom HTML elements. Being
  the most popular of the JavaScript frameworks this release provides an
  opportunity to push for the adoption of web components in areas like design
  system component libraries. In this post I'll take a look at how we can
  provide a good developer experience to aid for adoption of web components in
  this area.
tags:
  - posts
  - web components
  - typescript
  - react
date: 2025-01-16
draft: true
---

## An argument for custom elements

Set aside the debate from last year around the usefulness of custom elements in
this world of component based JavaScript frameworks and libraries and you really
can't deny that they provide the perfect opportunity to build framework agnostic
components to support your business growth now and into the future.

You can of course achieve similar results by focusing efforts upon a single
JavaScript framework like React, ignoring the web platform and shackling
yourself to its future developments. In the past I've seen companies make this
choice using factors like talent acquisition, technology trends and well, let's
face it, herd mentality as reasoning.

Before version 19 React had limited support for custom elements and as the most
popular framework in the industry this did nothing to aid their adoption. With
this resolved I believe that we should advocate for building shared components,
even if only the primitives, with a platform first mindset using custom
elements. Not revolutionary thinking on my part, I know, just an observation of
this golden opportunity. With me? Let's see how to ensure we provide a first
class developer experience to aid adoption.

### What changed for custom elements in React 19?

Before version 19 React applied props to custom elements by serializing the
value as a string and setting it as an attribute. This prevented the use of
elements with complex properties and resulted in the need for a proxy component
wrapper around the element to get and set the properties, deal with applying the
`className` prop as the `class` attribute and provide props to handle custom
events.

### A quick note on Angular, Vue and Svelte

The Angular, Vue, Svelte and other frameworks have long supported custom
elements. You can view the tests on [custom elements
everywhere][custom-elements-everywhere] to see all the frameworks that currently
ship full support for custom elements.

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
type Variant = "tile" | "section";

export interface CardElement extends HTMLElement {
  variant: Variant;
}

export class Card implements CardElement {
  #variant: Variant;

  get variant() {
    return this.#variant;
  }

  set variant(variant: Variant) {
    this.#variant = variant;
  }
}
```

To make this element known to TypeScript we extend the `HTMLElementTagNameMap`
interface so that newly created elements `document.createElement('my-card')`
have the correct type as do DOM queries for the element.

```ts
declare global {
  interface HTMLElementTagNameMap {
    "my-card": CardElement;
  }
}

const card = document.createElement("my-card");
// Type '"product"' is not assignable to type 'Variant'
card.variant = "product";

// type HTMLCollectionOf<CardElement>
const cards = document.getElementsByTagName("my-card");

// type CardElement or null
const qCard = document.querySelector("my-card");

// type NodeListOf<CardElement>
const qCards = document.querySelectorAll("my-card");
```

To use the card element in a project with a framework that has both TypeScript
and JSX, type definitions for the elements in the JSX name space need defining.
To do this for React, extend the `IntrinsicElements` interface and add the
custom element definitions. The module in which these types exist depends on the
TypeScript configuration for the `jsx` compiler option so need adding for each
(`react`, `react/jsx-runtime` etc).

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

Each component gets exported both ways from the library, either as a separate
package or a module in a package. The components then get installed with a
package manager or imported from a CDN. This approach works for fine for browser
(client) pages and applications but to support the server rendering seen in some
of the latest meta frameworks we need to ensure the browser only code doesn't
get loaded in the server environment.

### Server Side Rendering (SSR)

As HTML, custom elements without the accompanying JavaScript that upgrades them
require no special treatment for server side rendering. For more traditional
page rendering like that of PHP or Ruby on rails the custom element JavaScript
just needs including in the rendered page. Full stack JavaScript frameworks that
run JavaScript on the server work the same way but introduce the risk that the
custom element JavaScript gets included in the server bundle. This often results
in the `HTMLElement is not defined` error and requires that the code for the
component gets segregated for loading on the client only, `use client` in
Next.js for instance.

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[custom-element-manifest]:
  https://github.com/webcomponents/custom-elements-manifest
[custom-element-analyzer]: https://github.com/open-wc/custom-elements-manifest
[cem-plugin]:
  https://github.com/break-stuff/cem-tools/tree/main/packages/jsx-integration#readme
