---
title: Applying new CSS scroll features to design system components
description:
draft: true
---

A lot of the examples for the new scrolling features coming to CSS have used the
Carousel pattern as a demonstration. [This post][carousel-article] by Adam
Argyle has a great explanation of the features and has a gallery of inspiring
examples. The carousel also featured in some talks at the latest [Google IO
event][google-io] and got me thinking about other areas to use these features.

## Scrollable tabs

The [Scrollable Tabs][scrollable-tabs] component allows the number of tabs in a
tabbed page section to exceed the width of the parent container. To build this
feature may seem trivial at first look but requires a good amount of JavaScript
to achieve without these new CSS features.

### Removing the scroll bar

To start we will create the tabs structure and apply a basic scrolling overflow
with CSS. When the list of tabs exceeds the available space they overflow the
container and show a horizontal scroll bar.

```html
<style>
  .tablist {
    display: flex;
    gap: 0.125rem;
    overflow-x: auto;
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

The `scrollbar-width` property allows us to remove the scroll bar by setting a
value of `none`. What a godsend, no longer do we have to use JavaScript or CSS
hacks to hide the scroll bar.

```css
.tablist {
  scrollbar-width: none;
}
```

Already this works okay for touch devices but horizontal scrolling with a mouse
without a scroll bar doesn't.

### Adding back and forward scroll buttons

To date, adding buttons to scroll hidden tabs into view took a fair amount of
JavaScript to track the scroll position and enable and disable the buttons when
reaching either end of the list. Animating the scrolling complicated things even
further.

The scroll-button psuedo-elements handle this for us! To add the buttons we
specify the selectors on the tab list and provide content for the buttons with
some alternative text.

```css
.tablist {
  &::scroll-button(inline-start) {
    content: "<" / "Previous";
  }

  &::scroll-button(inline-end) {
    content: ">" / "Next";
  }
}
```

We can apply common styles for all scroll buttons and target the usual button
states using the all selector.

```css
.tablist {
  &::scroll-button(*) {
    color: rbg(0 0 0 / 75%);
  }

  &::scroll-button(*):hover {
    color: rbg(0 0 0 / 95%);
  }
}
```

### Positioning the scroll buttons

Positioning the scroll buttons to the start and end of the tab list we can use
[anchor positioning][anchor-positioning]. With anchor positioning we align the
buttons to the containing box of the tab list, outside of the content overflow.

To do this we need to wrap the tab list in a relative positioned container
element. This allows us to anchor the buttons at the start and end with absolute
positioning and also center align the buttons with the tabs.

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

### Animating the scroll

When we click the scroll buttons the tab list jumps to the next position
instantly. To animate the scroll we apply the `scroll-behavior` property of
`smooth` to add a smooth transition to the next set of tabs.

```css
.tablist {
  scroll-behavior: smooth;
}
```

### Putting it all together

When we put the main components together we have a working set scrollable tabs
in less that 20 lines of CSS! A little sprinkling of JavaScript to handle tab
selection and keyboard navigation for accessibility makes it usable. With a
little bit more anchor positioning we can even add the animated indicator the
Material Tabs to show the currently selected tab without any JavaScript.

<style>
.tablist-wrapper {
  margin: 0 auto 3rem;
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
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  text-transform: uppercase;
  white-space: nowrap;

  &[aria-selected="true"] {
    color: light-dark(rgb(18, 92, 165), rgb(144, 202, 249));
    anchor-name: --selected-tab;
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
</style>

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

[carousel-article]: https://developer.chrome.com/blog/carousels-with-css
[google-io]: https://youtu.be/GSVe6zguiao?si=15-ZnNVwETe4gkra&t=20
[scrollable-tabs]: https://youtu.be/GSVe6zguiao?si=15-ZnNVwETe4gkra&t=20
[anchor-positioning]:
  https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning
