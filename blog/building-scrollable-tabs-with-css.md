---
title: Building scrollable tabs with experimental CSS features
description:
  New overflow and positioning features coming to CSS are making it easier to
  build common UI patterns with minimal JavaScript. This post explores how to
  build scrollable tabs using features from the overflow module and anchor
  positioning draft specifications
tags:
  - posts
  - html
  - css
date: 2025-06-10
social_card: building-scrollable-tabs-with-css.jpg
---

## Carousel? Nah, scrollable tabs!

Recent examples of new experimental scroll features in the CSS [overflow
module][overflow-module] use the Carousel pattern as a demonstration. [This
post][carousel-article] by Adam Argyle provides an in-depth explanation of the
features with a gallery of inspiring examples. Similar carousels also featured
in some talks at the latest [Google IO event][google-io] and got me thinking
about other areas where we can use these new tools.

The tabs pattern is a staple in any design systems and appears in most
applications. Without a native HTML implementation, gracefully dealing with a
list of tabs that exceed the width of the parent container requires a good
amount of JavaScript to achieve. With these new CSS features, we still don't
have a native solution but we can at least ditch a good amount of JavaScript.

Using the [Scrollable Tabs][scrollable-tabs] Material Design component as an
reference, we'll attempt to replicate the functionality with minimal JavaScript
and explore some new and experimental CSS features that make it possible.

## Removing the horizontal scroll bar

To start, we will create a basic tabs structure using flex box to align them
with a horizontal overflow. When the list of tab buttons exceeds the available
space they overflow and show a horizontal scroll bar.

We don't want to show the scroll bar so set the
[scrollbar-width][scrollbar-width] property to `none` to remove it.

```html
<style>
  .tablist {
    display: flex;
    gap: 0.125rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
</style>

<div class="tablist" role="tablist">
  <button role="tab">Tab one</button>
  <button role="tab">Tab two</button>
  <button role="tab">Tab three</button>
  <button role="tab">Tab four</button>
  <button role="tab">Tab five</button>
  <button role="tab">Tab six</button>
  <button role="tab">Tab seven</button>
  <button role="tab">Tab eight</button>
  <button role="tab">Tab nine</button>
  <button role="tab">Tab ten</button>
</div>
```

## Adding buttons to control scrolling

Removing the scroll bar works okay on touch devices but for users with a mouse
we need to add next and previous buttons.

The [scroll-button][scroll-button] psuedo-elements handle this for us. To add
the buttons at the start and end of the tab list we specify the inline
directions. Providing a content property for the buttons, with some alternative
text, enables them.

```css
.tablist::scroll-button(inline-start) {
  content: "<" / "Previous";
}

.tablist::scroll-button(inline-end) {
  content: ">" / "Next";
}
```

To add common styles for all scroll buttons we use a universal `*` selector and
style button states in the usual way.

```css
.tablist::scroll-button(*) {
  color: rbg(0 0 0 / 75%);
}

.tablist::scroll-button(*):hover {
  color: rbg(0 0 0 / 95%);
}
```

## Positioning the scroll buttons with anchor positioning

To position the scroll buttons to the start and end of the tab list we use
[anchor positioning][anchor-positioning]. This allows us to align the buttons to
the containing box of the tab list, outside of the content overflow.

To achieve this we wrap the tab list in a relative positioned container element
and anchor the buttons at the start and end with absolute positioning. The
anchor also helps us to center align the buttons with the tabs.

```css
.tablist-wrapper {
  position: relative;
}

.tablist {
  anchor-name: --tab-list;

  &::scroll-button(*) {
    align-self: anchor-center;
    position: absolute;
    position-anchor: --tab-list;
  }

  &::scroll-button(inline-start) {
    left: anchor(start);
  }

  &::scroll-button(inline-end) {
    right: anchor(end);
  }
}
```

## Animating the scroll behaviour

Clicking the scroll buttons jumps the tab list to the next position instantly.
To animate the scroll we set the [scroll-behavior][scroll-behavior] property
with a value of `smooth` to add a smooth transition to the next set of tabs.

```css
.tablist {
  scroll-behavior: smooth;
}
```

## Putting it together, with a sprinkling of JavaScript

When we put this all together we have a working set of scrollable tabs in less
than 20 lines of CSS! We need a small amount of JavaScript to handle tab
selection for the demo and to enable keyboard navigation. We create the animated
indicator, like what we see in Material Design, with pure CSS using a little bit
more anchor positioning.

<style>
.tablist-wrapper {
  margin: 3rem auto;
  max-width: 600px;
  overflow: hidden;
  padding: 0 2rem;
  position: relative;
}

.tablist {
  anchor-name: --tab-list;
  background: var(--color-bg-secondary);
  display: flex;
  gap: 0.125rem;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;

  &::scroll-button(*) {
    align-self: anchor-center;
    background: var(--color-bg-secondary);
    border: none;
    border-bottom: 2px solid var(--color-bg-secondary);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0.75rem 0.5rem;
    position: absolute;
    position-anchor: --tab-list;
    width: 2rem;
    z-index: 2;
  }

  &::scroll-button(inline-start) {
    content: "<" / "Previous";
    left: calc(anchor(start) - 2rem);
  }

  &::scroll-button(inline-end) {
    content: ">" / "Next";
    right: calc(anchor(end) - 2rem);
  }
}

.tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  text-transform: uppercase;
  white-space: nowrap;

  &[aria-selected="true"] {
    color: light-dark(rgb(18, 92, 165), rgb(144, 202, 249));
    anchor-name: --selected-tab;
  }

  &:focus-visible {
    background: light-dark(rgb(0 0 0 / 5%), rgb(255 255 255 / 8%));
    outline: 0;
  }
}

.indicator {
  position: absolute;
  position-anchor: --selected-tab;
  left: anchor(start);
  right: anchor(end);
  bottom: anchor(bottom);
  height: 2px;
  background: light-dark(rgb(25, 118, 210), rgb(144, 202, 249));
  transition: left 0.3s ease-in-out, right 0.3s ease-in-out;
  z-index: 1;
}

.notice {
  background: var(--color-bg-secondary);
  display: flex;
  gap: 1rem;
  font-weight: 600;
  margin: 2rem auto;
  padding: 1rem;

  &:before {
    content: "⚠️";
    display: block;
    font-size: 1.5rem;
  }
}

@supports selector(::scroll-button(*)) {
  .notice {
    display: none;
  }
}
</style>

<div class="notice">
    Looks like your browser doesn't support these CSS features and the example below may not work as expected.
    Try viewing this page in the latest version of Chrome instead.
</div>
<div class="tablist-wrapper">
  <div class="tablist" role="tablist">
    <button class="tab" role="tab" aria-selected="true" tab-index="0">Tab one</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab two</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab three</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab four</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab five</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab six</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab seven</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab eight</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab nine</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab ten</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab eleven</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab twelve</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab thirteen</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab fourteen</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab fifteen</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab sixteen</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab seventeen</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab eighteen</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab nineteen</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1">Tab twenty</button>
  </div>
  <div class="indicator"></div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const tabList = document.querySelector('.tablist');
  const tabs = document.querySelectorAll('.tab');

  tabList.addEventListener('click', (e) => {
    const targetTab = e.target.closest('[role="tab"]');
    if (!targetTab) return; // Ignore clicks outside tabs

    // Activate the clicked tab
    activateTab(targetTab);
  });

  // Add keyboard navigation
  tabList.addEventListener('keydown', (e) => {
    const targetTab = e.target;
    const previousTab = targetTab.previousElementSibling;
    const nextTab = targetTab.nextElementSibling;
    const firstTab = tabs[0];
    const lastTab = tabs[tabs.length - 1];

    // Only handle key events if a tab triggered them
    if (targetTab.getAttribute('role') !== 'tab') return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (previousTab && previousTab.getAttribute('role') === 'tab') {
          activateTab(previousTab);
        } else {
          activateTab(lastTab); // Cycle to end
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (nextTab && nextTab.getAttribute('role') === 'tab') {
          activateTab(nextTab);
        } else {
          activateTab(firstTab); // Cycle to beginning
        }
        break;
      case 'Home':
        e.preventDefault();
        activateTab(firstTab);
        break;
      case 'End':
        e.preventDefault();
        activateTab(lastTab);
        break;
    }
  });

  function activateTab(tab) {
    // Deactivate all tabs
    tabs.forEach(t => {
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });

    // Activate the current tab
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');
    tab.focus();
  }
});
</script>

You can view the full code for the example above on [CodePen][codepen].

[overflow-module]: https://drafts.csswg.org/css-overflow-5/
[carousel-article]: https://developer.chrome.com/blog/carousels-with-css
[google-io]: https://youtu.be/GSVe6zguiao?si=15-ZnNVwETe4gkra&t=20
[scrollable-tabs]: https://mui.com/material-ui/react-tabs/#scrollable-tabs
[scrollbar-width]:
  https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-width
[scroll-button]:
  https://developer.mozilla.org/en-US/docs/Web/CSS/::scroll-button
[scroll-behavior]:
  https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior
[anchor-positioning]:
  https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning
[codepen]: https://codepen.io/p-m-p/pen/ogXBvBO
