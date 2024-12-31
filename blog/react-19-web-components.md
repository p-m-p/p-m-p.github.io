---
title: React supports web components, but it aint that simple
description: React 19 shipped with long awaited support for custom HTML elements.
  Let's take a look at avoiding all of the foot guns when using a web component in
  React and TypeScript across client and server components.
tags:
  - posts
  - web components
  - typescript
  - react
date: 2025-01-01
draft: true
---

You're the latest software engineering hire in a team within the ACME Corporation
responsible for the shipping of hazardous products to various locations across the
world. You've been tasked with building a new application for support staff to help
them deal with the ever growing amount of customer complaints of faulty goods and
the subsequent order returns.

## The common React denominator

Before you joined the company you're new team already spent zero time on gathering
requirements to aid in choosing the right technology and decided to build the
application with React and Next.js. Your first task on the project is to set up the
new application with TypeScript and integrate the companies new design system components.
ACME Corporation is a forward thinking compnay and the design system team has implemented
a suite of re-usable components that leverage core web platform technologies.
_"That's fine"_ you think to yourself, _"React 19 shipped recently and I heard it has
full support for web components..."_

You read the getting started docs on the Next.js website and create a new project
selecting TypeScript as an option when prompted. The wireframes you've been given for
the dashboard page of the application has a tabbed navigation panel for the pending, open
and processed returns so you install company design system package and import the tabs
components.

```tsx
import "@acme-corp/ds/tabs"

export function Dashboard() {
  return null
}
```

## ReferenceError: HTMLElement is not defined

Before you can event code any of the HTML the page blows up in the browser with an error
message telling you that HTMLElement is not defined. You're aware of how server side rendering
works and after briefly reading some docs you think that this is code that maybe should only run
on the client and requires a `"use client"` directive. You move the import to a new component
file for the tabs section, add the directive at the top and the page loads, great!

```tsx
"use client"

import "@acme-corp/ds/tabs"

export function Tabs() {
  return null
}
```

You continue to add the tab element to your new component but notice the error is still
showing in the terminal where the dev sever is running. You double check the documentation
and realise that Next is rendering the component to HTML before sending it to the browser.
You don't find much help in the docs in resolving the issue so turn to ChatGPT. It recommends
using a dynamic import with some example code that isn't syntactically correct and gives a
few alternative suggestions like conditional rendering of the component. In the design system
documentation it lists a CDN version of the library so you decide to try this approach first.
You add a script tag to an app component and remove the tabs import from the component.

```tsx
import "next/script"

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Script src="https://cdn.acme-corp.net/acme-ds/1.0.0.min.js" />
    </>
  )
}
```

The error is gone and the page seems to be loading with the design system script. It doesn't
seem like the best option to include everything from the design system but right now you just
want to show progress to the team and get it working. You figure that you can remove the
`"use client"` directive from the Tabs component now and move on to ading the tab content...

## Property 'acme-tabs' does not exist on type 'JSX.IntrinsicElements'

Oh blast, what now. There's nothing in the browser or console but now your editor has a red
squiggly line and some TypeScript error about elements that are intrinsic to JSX. You quickly
check the React docs but nothing comes up so you turn again to ChatGPT. More helpful this time,
it gives you a good explanation that you need to add a TypeScript definition for the custom
elements to be able to use them in JSX. You copy the code snippet ChatGPT gives you and add it
to the top of the file.

```ts
declare namespace JSX {
  interface IntrinsicElements {
    'acme-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}
```

No dice, the error persists. You restart your editor and the Next dev server out of desparation
but still the error rears it's ugly head. You ask ChatGPT for more help and get a bunch of things
to try but nothing works. Your colleague seems to be a bit of a TypeScript evangelist so you ask
if she has any idea and she points you to a [discussion on Github][github-discussion] she finds.
"JSX is now scoped to the React module" she says almost as though she wrote the code herself.
You check the project `tsconfig.json` file and see that the `jsx` compiler option is set to
`preserve` and so make the update to include the react module.

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      'acme-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
```

Alright, the error has gone away. Phew! You add another definition for the tab element from the
design system and proceed with adding the HTML content. The tabs element has a size attribute you
need to use to make the tab labels smaller but when you add the attribute that red squiggly line
is back with an even longer TypeScript error message than before!.

```tsx
export function Tabs() {
  return (
    <acme-tabs size="sm"></acme-tabs>
  )
}
```

## Property 'size' does not exist on type 'DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>'

At this point you contemplate starting the project from scratch and not selecting the "include
TypeScript" option. Reading the error again it's not too difficult to see what the issue is but
you're not so sure how best to fix it. You consult with your colleague who's now very engaged with
your struggles and eager to help solve it. "I think you need to add the size attribute to the
element interface" she says before helping you update the code.

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      'acme-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size: 'sm' | 'md' | 'lg'
      };
    }
  }
}
```

Problem solved, but you can't help thinking to yourself that these components really shouldn't be
so difficult to use. "Are we going to have to do this for every component we need to use?" you ask.
She looks at you with shared concern and shrugs her shoulders, "let's check with the team building
the design system" she replies.

You message the lead engineer on the design system team and it turns out that you're the first team
to use the design system with React. "The team working on the new product screens didn't have any
issues" he tells you, "I think they're using Svelte". It's been at least two hours of pain by now
and you've made very little progress with the new application so decide to persevere with adding the
element types yourself.

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      'acme-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: 'sm' | 'md' | 'lg'
      };
      'acme-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label: string
      };
    }
  }
}
```

This feels very wrong but you'll have to come back to it once you've shown some progress on the
feature you've been assigned to work on. You add the logic to pull the tab content from the database
and implement the Tabs component.

```tsx
```

[custom-elements-everywhere]: https://custom-elements-everywhere.com/
[react]: https://react.dev/learn
[nextjs]: https://nextjs.org/docs/app/getting-started/installation
[use-client]: https://react.dev/reference/rsc/use-client
[matt-pocock]: https://www.mattpocock.com/
[github-discussion]: https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71395
