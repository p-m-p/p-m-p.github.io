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

## Polymorphic components

React frameworks often have a concept of component polymorphism. Some examples of this
are the `component` prop in [MUI][mui-component-prop] and [Mantine][mantine-polymorphic]
or the [Slot][radix-slot] element in Radix. This polymorphism provides a mechanism to
render an alternative element to the default and have the same styling and behaviours
applied. In [web components][custom-elements] the [slot][slot] element can achieve
similar results.

## Tabbed navigation components

Take this set of web components for a tabbed navigation section as an example. By
default the tab element currently displays a button that shows the associated tab
panel when clicked. The component needs to also support the use of a single tab panel
and have the tabs render as links to navigate between sections to show the tab content.

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

The `my-tab` component implementation uses [Shadow DOM][shadow-dom] with a template that
has a default slot for the button label and applies styling to the button.

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

Trying to use this tab element with a link in the slot will result in rendering the link
inside the button element. To solve this use case the tab element could potentially replace
the button for a link if it has an `href` attribute or perhaps a click event listener applied
to the tab could drive the navigation. In application development a framework often provides
a link component and the tab needs to support this.

```html
<!-- Ends up with the anchor inside the button -->
<my-tab><a href="/tab-page">Link tab</a></my-tab>

<!-- This could work but won't allow the use of framework components -->
<my-tab href="/tab-page">Link tab</my-tab>
```

## Layering slots

To achieve polymorphism in the tab element a named slot around the button replaces it with
the provided element.

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

Layering the slots in this way allows the element to support either a label for the button
as before or another element to replace it. Here a React component for the tab navigation
uses the slot attribute on a Next.js [Link component][next-link] to replace the button.

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

The named slot replaces the button but the styling doesn't get applied to the anchor element.
To resolve this we change the style selector to target the slotted element as well as the
button using the [`::slotted()`][slotted] pseudo-element selector.

```html
<template>
  <style>
    button, ::slotted(*) {
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

Now the styling applies to any slotted element. The selector may also specify elements like
an anchor or other selectors like a class name.

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
