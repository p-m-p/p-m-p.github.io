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

The Angular, Vue and Svelte frameworks have long had first class support for web
components with a component template syntax that uses HTML. As per the tests on
[custome elements everywhere][custom-elements-everywhere]

## The common React denominator

If you create a new project with React 19 by following the official
documentation then you probably landed with a Next.js or Remix application. For
the purposes of this article I will use a Next.js application with Typescript
and explore the steps needed to consume web components from the BlueprintUI
design system.

## Importing a component

After creating the application and adding the BlueprintUI CSS I proceeded to
replace the button on the example home page.

```tsx
import "@acme-corp/ds/tabs";

export function Dashboard() {
  return null;
}
```

## ReferenceError: HTMLElement is not defined

## Property 'acme-tabs' does not exist on type 'JSX.IntrinsicElements'

## Property 'size' does not exist on type 'DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>'

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[react]: https://react.dev/learn
[nextjs]: https://nextjs.org/docs/app/getting-started/installation
[use-client]: https://react.dev/reference/rsc/use-client
[matt-pocock]: https://www.mattpocock.com/
[github-discussion]:
  https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71395
