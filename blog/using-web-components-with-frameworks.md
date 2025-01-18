---
title: Why use custom elements in a world of JavaScript frameworks?
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

## Creating a good developer experience for custom elements

Focusing on React as a framework, and ignoring fundamental aspects like
consistency and performance, let's run through what we expect from a component
library and how we can leverage it within a full stack environment like Next.js
or Remix.

### Type safety

As library authors we can't ignore TypeScript if we want to provide a rich user
experience. Well defined types help prevent misuse of components, enable auto
completion in the development workflow and aid with other forms of code
generation. Let's take a look at how to create custom element types with an
example card component.

```html
<my-card variant="product">
  <h2 slot="title">Card title</h2>
  <p slot="content">Card content</p>
  <a slot="action" href="/">Card action</a>
</my-card>
```

### Server Side Rendering (SSR)

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[react]: https://react.dev/learn
[nextjs]: https://nextjs.org/docs/app/getting-started/installation
[use-client]: https://react.dev/reference/rsc/use-client
[matt-pocock]: https://www.mattpocock.com/
[github-discussion]:
  https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71395
