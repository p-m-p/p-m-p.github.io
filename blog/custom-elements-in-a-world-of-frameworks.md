---
title: A place for custom elements in a world of JavaScript frameworks
description:
  Last year, React 19 shipped with full support for custom HTML elements. Being
  the most popular of the JavaScript frameworks this release provides us with an
  opportunity to adopt web components in areas like design system component
  libraries. In this post I take a look at how to provide a good developer
  experience to aid adoption in this area.
tags:
  - posts
  - web components
  - typescript
  - react
date: 2025-01-28
---

## An argument for custom elements

Setting aside the recent debate on the usefulness of custom elements in this
world of component based JavaScript frameworks and libraries, custom elements
provide the perfect opportunity for us to build framework agnostic components
that support web development projects now and into the future.

Before version 19, React had limited support for custom elements and as the
industry leading framework this has done nothing to aid their adoption. With
these issues now resolved I believe that we should advocate for building
reusable components, even if only the core primitives, with a platform first
mindset using custom elements. Not revolutionary thinking on my part, I know,
just an observation of the opportunity. With me? Great, let's see how to ensure
we provide a first class developer experience when using our elements.

### What exactly changed for custom elements in React 19?

Older versions of React would apply props to custom elements by serializing the
value as a string and setting it as an attribute. This prevented the use of
elements with complex properties and often resulted in the need for a component
wrapper around the element to deal with the properties, apply the `className`
prop as the `class` attribute and define props for custom events.

### A side note on the other frameworks

Angular, Vue.js, Svelte and other frameworks have long supported custom
elements. You can view the list of frameworks on [custom elements
everywhere][custom-elements-everywhere] that currently ship with full support.

## Optimising custom element developer experience

Frameworks do a good job of abstracting away lower level constructs of the web
platform like event handling and DOM updates. Developers will expect to leverage
our elements in the same way as framework specific components so we need to
provide the tools and structure to support this, especially for full stack
JavaScript environments like Next.js or Remix.

### Type safety

As library authors we can't ignore TypeScript if we want to provide a rich user
experience. Well defined types help prevent misuse of components, enable auto
completion in the development workflow and aid with other forms of code
generation.

Consider the types for this custom card element.

```html
<my-card variant="tile">
  <h2 slot="title">Title</h2>
  <p slot="content">Card content</p>
  <a slot="action" href="/">Card action</a>
</my-card>
```

The element has a single attribute named `variant` and a matching property on
the underlying object class. The interface for this class extends `HTMLElement`
and defines the property with the available variants.

```ts
type Variant = "tile" | "section";

export interface CardElement extends HTMLElement {
  variant: Variant;
}

export class Card extends HTMLElement implements CardElement {
  #variant: Variant = "tile";

  get variant() {
    return this.#variant;
  }

  set variant(variant: Variant) {
    this.#variant = variant;
  }
}
```

To make the card element known to TypeScript we need to extend the
`HTMLElementTagNameMap` interface so that developers have the correct type when
working with the DOM API.

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

For frameworks that use TypeScript and JSX, type definitions for the elements
need defining in the JSX name space. To do this for React, we extend the
`IntrinsicElements` interface to add the custom element properties and
attributes. The module in which these types exist depends on the TypeScript
configuration for the `jsx` compiler option and needs defining for each
(`react`, `react/jsx-runtime` etc).

Without the type definitions use of the element in JSX will result in a
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
will likely result in mistakes down the line. Instead, we can automate their
generation from a [custom element manifest][cem].

We can even generate the manifest and the type definitions for our elements by
using [this analyzer][custom-element-analyzer] to first generate the manifest
and [this plugin][cem-plugin] to generate the types. The analyzer will surface
the attributes, properties and custom events but, depending on the element
implementation, may require a bit of finessing with JsDoc comments.

To generate editor extensions from the element manifest to aid with development
when using the elements in HTML, GitHub user break-stuff also kindly provided
[plugins][cem-tools] for VS Code and JetBrains IDEs among other tools.

### Flexible bundling and loading options

JavaScript for custom elements needs to either load independently in the
document or get bundled with the rest of the application code. To support either
scenario the library can export the unregistered element class and expose
another module with the element defined. If we want to maintain a level of
control of the element names we can supply a method on or with the class to
perform the registration.

```ts
// class is exported from @ds/my-element/MyElement and the
// defined element from named export @ds/my-element
export class MyElement extends HTMLElement {
  static register(tagName = "my-element") {
    customElements.define(tagName, this);
  }
}
```

Application developers who want finer control over code bundling can import the
class and register the elements where and when they wish.

```ts
import { MyElement } from "@ds/my-element/MyElement";

MyElement.register();
```

Developers doing rapid development like prototyping or those who only wish to
use a small set of the components can import the defined elements individually.
A script with type `importmap` helps here to maintain the root URI of the
package in a single location.

```html
<script type="importmap">
  {
    "imports": {
      "@ds/": "https://cdn.example/ds/esm/"
    }
  }
</script>

<script type="module">
  import "@ds/my-element";
</script>

<!-- Upgraded element -->
<my-element></my-element>
```

I wrote [this article][exports-article] outlining a strategy for generating ESM
library exports when working with TypeScript that might help here.

### Server Side Rendering (SSR)

To support server rendering in some of the latest meta frameworks we need to
ensure that browser only code doesn't get included in the server environment. As
HTML, custom elements without the JavaScript that upgrades them requires no
special treatment for server side rendering. For more traditional page rendering
like that of a server application written in PHP or Ruby the custom element
JavaScript just needs including with the document.

Full stack frameworks that run JavaScript on the server to render HTML work in a
similar way but actually run the JavaScript to create the render tree. If the
element code gets included here it normally results in a
`HTMLElement is not defined` error or some other missing browser global like
`customElements`.

To best support server rendering we can ensure library modules that don't
reference the browser APS get exported independently. This allows importing
domain objects like a theme configuration into the application context.

```tsx
"use client";

// createTheme is safe to import and use during server rendering
import { createTheme } from "@ds/theme";
import AppContext from "./AppContext";
import ThemeSwitch from "./ThemeSwitch";
import usePreferences from "./usePreferences";

export default function Layout({ children }: React.PropsWithChildren) {
  const theme = createTheme({ mode: usePreferences("theme") });

  return (
    <AppContext theme={theme}>
      <div class="page">{children}</div>
      <ThemeSwitch />
    </AppContext>
  );
}
```

I'll close on this point, we should consider the needs of framework developers
and provide utilities that improve the experience of working with our elements.
That might come in the form of utility objects to apply type safe styling for
other components in the application or perhaps even framework extensions like
context providers.

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[cem]: https://github.com/webcomponents/custom-elements-manifest
[custom-element-analyzer]: https://github.com/open-wc/custom-elements-manifest
[cem-tools]: https://github.com/break-stuff/cem-tools
[cem-plugin]:
  https://github.com/break-stuff/cem-tools/tree/main/packages/jsx-integration#readme
[material-web]: https://m3.material.io/develop/web
[exports-article]: /blog/typescript-package-entry-points/
