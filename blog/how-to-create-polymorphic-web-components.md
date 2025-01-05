---
title: How to create polymorhpic web components
description: The slot element provides us with the tools to create polymorhpic custom
  elements. This post explores how a tab element within a tabbed navigation section can
  be used with a Next.js link component.
tags:
  - posts
  - web components
date: 2025-01-05
---

## What are polymorphic components?

React frameworks often have a concept of component polymorphism. Some examples of this
are the `component` prop in [MUI][mui-component-prop] and [Mantine][mantine-polymorphic]
or the [Slot][radix-slot] element in Radix. This polymorphism provides an mechanism to
render an alternative element to the default and have the same styling and behaviours
applied. In [web components][custom-elements] the [slot][slot] element is used to achieve
similar results.

## Tabbed navigation components

Here's a set of web components for a tabbed navigation section. By default the tab
element currently displays a button that shows the associated tab panel when clicked.
The component needs to also be used with a single tab panel and have the tabs render
as links to navigate between sections.

```html
<my-tabs>
  <my-tab>Tab one</my-tab>
  <my-tab>Tab two</my-tab>
  <my-tab>Tab three</my-tab>
</my-tabs>
<my-tabpanel>
  <p>Selected tab content</p>
</my-tabpanel>
```

The `my-tab` component uses [Shadow DOM][shadow-dom] with a template that has a default
slot for the button label and applies styling to the button.

```html
<template>
  <style>
    button {
      /* button styles */
    }
  </style>
  <button>
    <slot></slot>
  </button>
</template>
```

Trying to use this tab element as is with a link in the slot will result in rendering the
link inside the button element. To solve this use case the tab element could replace the
button for a link if it has an `href` attribute or perhaps an event listener could be
applied to the tab instead to drive navigation. More often in application development a
link component is provided by a framework, such as the Next.js [Link component][next-link],
and the tab should support this.

```html
<!-- Ends up with the anchor inside the button -->
<my-tab><a href="/tab-page">Link tab</a></my-tab>

<!-- This could work but won't allow the use of framework Link components -->
<my-tab href="/tab-page">Link tab</my-tab>
```

## Layering slots

To achieve this polymorphism in the tab element a named slot is added around the button to
replace it with the provided element, the Next.js link.

```html
<template>
  <style>
    button {
      /* button styles */
    }
  </style>
  <slot name="button">
    <button>
      <slot></slot>
    </button>
  </slot>
</template>
```

Layering the slots in this way means the element can be used with just a label for the button
as before or another element can be used in its place. Here a React component for the tab
navigation uses the slot attribute on the Link component to replace the button.

```jsx
import Link from 'next/link';

export default function TabNavigation({ sections }) {
  return (
    <my-tabs>
      {sections.map(({ title, path }) => (
        <my-tab key={path}>
          <Link slot="button" href={path}>{title}<Link>
        </my-tab>
      ))}
    </my-tabs>
  )
}
```

## Styling slotted elements

The named slot replaces the button but the styling is not applied to the anchor element. To
resolve this the slotted element needs to be targeted as well as the default button when
applying the styles. This is achieved with the [`::slotted()`][slotted] pseudo-element
selector.

```html
<template>
  <style>
    button,
    ::slotted(*) {
      /* button styles */
    }
  </style>
  <slot name="button">
    <button>
      <slot></slot>
    </button>
  </slot>
</template>
```

Now the style is applied to any slotted element but the selector can be narrowed to specific
elements like the anchor or to selectors like a class name.

```css
::slotted(a) {
  /* anchor styles */
}

::slotted(.link) {
  /* .link styles */
}
```

[mui-component-prop]: https://mui.com/material-ui/guides/composition/#component-prop
[mantine-polymorphic]: https://mantine.dev/guides/polymorphic/
[radix-slot]: https://www.radix-ui.com/primitives/docs/utilities/slot
[custom-elements]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
[slot]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot
[shadow-dom]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
[slotted]: https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted
[next-link]: https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#link-component
