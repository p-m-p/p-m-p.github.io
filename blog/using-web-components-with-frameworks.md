---
title: Using web components with modern JavaScript frameworks
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

## A quick note on Angular, Vue and Svelte

The Angular, Vue, Svelte and other frameworks have long supported custom
elements with a component template syntax that utilises and extends standard
HTML. As per the tests on [custom elements
everywhere][custom-elements-everywhere] these frameworks provide support for
attribute/property binding and the handling of custom events.

## Changes to custom element handling in React 19

Before version 19 React had some limitations in using custom elements. In these
older version applying props to custom elements results in serializing the value
as a string and setting it as an attribute. This prevents the use of elements
with complex properties and results in the need for a proxy component around the
element to get and set the properties and also deal with applying the
`className` prop as the `class` attribute.

## A use case for custom elements

Ignoring recent debate<sup>[1]</sup> around the usefulness of custom elements in
a world of component based JavaScript frameworks, you can't deny that they make
a good fit as the core of a design system. Building component primitives with
custom elements provides a platform on which organisations can experiment,
easily pivot on technology choice and profit from performance gains in areas
like marketing that often don't require the use of a framework like React.

## Creating a good developer experience

## Using elements with TypeScript

## Auto completion of HTML/JSX attributes

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[react]: https://react.dev/learn
[nextjs]: https://nextjs.org/docs/app/getting-started/installation
[use-client]: https://react.dev/reference/rsc/use-client
[matt-pocock]: https://www.mattpocock.com/
[github-discussion]:
  https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71395
