---
title: A place for custom elements in a world of JavaScript frameworks
description:
  Last year, React 19 shipped with full support for custom HTML elements. Being
  the most popular of the JavaScript frameworks this release provides an
  opportunity to push for the adoption of web components in areas like design
  system component libraries. In this post I take a look at how to provide a
  good developer experience to aid adoption in this area.
tags:
  - posts
  - web components
  - typescript
  - react
date: 2025-01-16
draft: true
---

## The argument for custom elements

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
popular framework in the industry this has done nothing to aid their adoption.
With these issues resolved I believe that we should advocate for building
reusable components, even if only the core primitives, with a platform first
mindset using custom elements. Not revolutionary thinking on my part, I know,
just an observation of the opportunity. With me? Cool, let's see how to ensure
we provide a first class developer experience to aid adoption.

### What exactly changed for custom elements in React 19?

Before version 19 React applied props to custom elements by serializing the
value as a string and setting it as an attribute. This prevented the use of
elements with complex properties and resulted in the need for a component
wrapper around the element to deal with the properties, apply the `className`
prop as the `class` attribute and define props for custom events.

### A quick note on the other frameworks

Angular, Vue.js, Svelte and other frameworks have long supported custom
elements. You can view the list of frameworks on [custom elements
everywhere][custom-elements-everywhere] that currently ship with full support.

## Optimising the developer experience

Let's consider a component library like [Material][material-web] as an example
to run through what we expect from a component library and how we can leverage
it within a full stack JavaScript environment like Next.js or Remix.

### Type safety

As library authors we can't ignore TypeScript if we want to provide a rich user
experience. Well defined types help prevent misuse of components, enable auto
completion in the development workflow and aid with other forms of code
generation. Let's take a look at how to create custom element types for a card
component.

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
  #variant: Variant = "tile";

  get variant() {
    return this.#variant;
  }

  set variant(variant: Variant) {
    this.#variant = variant;
  }
}
```

To make this element known to TypeScript we need to extend the
`HTMLElementTagNameMap` interface so that elements have the correct type when
working with the DOM API in JavaScript.

```ts
declare global {
  interface HTMLElementTagNameMap {
    "my-card": CardElement;
  }
}

const card = document.createElement("my-card");
// Error: Type '"product"' is not assignable to type 'Variant'
card.variant = "product";

// cards has type HTMLCollectionOf<CardElement>
const cards = document.getElementsByTagName("my-card");

// qCard has type CardElement or null
const qCard = document.querySelector("my-card");

// qCards has type NodeListOf<CardElement>
const qCards = document.querySelectorAll("my-card");
```

For frameworks that use both TypeScript and JSX, type definitions for the
elements in the JSX name space need defining. To do this for React, we extend
the `IntrinsicElements` interface to add the custom element class and
attributes. The module in which these types exist depends on the TypeScript
configuration for the `jsx` compiler option and need adding for each (`react`,
`react/jsx-runtime` etc).

Without these type definitions use of the element in JSX will result in a
TypeScript error for the unknown element.

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

Now, this immediately looks complex and having to maintain these types by hand
will surely result in headaches and mistakes down the line. Instead, we can
automate the generation of these types from a [custom element
manifest][custom-element-manifest].

In fact, we can provide both a manifest and type definitions for our components
by using [this analyzer][custom-element-analyzer] to generate the manifest and
[this plugin][cem-plugin] to generate the types. The analyzer will surface the
attributes, properties and custom events but, depending on the use case, may
require a bit of finessing with JsDoc comments.

To generate editor extensions for using the elements with standard HTML syntax,
GitHub user break-stuff (Burton Smith) also kindly provided [plugins][cem-tools]
for VS Code and JetBrains IDEs among other tools.

### Flexible bundling and loading options

JavaScript for custom elements needs to either load independently in the
document or get bundled with the rest of the application code. To support either
scenario the library can export the unregistered element class and expose
another module with the element defined. If we want to try and maintain control
of the element names we can supply a method on or with the class to perform the
registration.

```ts
// class from named export @ds/my-element/MyElement
// defined element from named export @ds/my-element
export class MyElement extends HTMLElement {
  static register(tagName = "my-element") {
    customElements.define(tagName, this);
  }
}
```

Application developers who want finer control over code bundling can import the
class and register the elements where they wish. Users doing prototyping or
those who only wish to use a small set of the components can import the defined
elements individually. I have [this article][exports-article] outlining a
strategy for generating named exports of library files in a single package.

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
[cem-tools]: https://github.com/break-stuff/cem-tools
[cem-plugin]:
  https://github.com/break-stuff/cem-tools/tree/main/packages/jsx-integration#readme
[material-web]: https://m3.material.io/develop/web
[exports-article]: /blog/typescript-package-entry-points/
