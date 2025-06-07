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

### Removing the scrollbar

To start we will create the tabs structure and apply a basic scrolling overflow
with CSS. When the list of tabs exceeds the available space they overflow the
container and show a horizontal scrollbar.

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

The `scrollbar-width` property allows us to remove the scrollbar by setting a
value of `none`. What a godsend, no longer do we have to use JavaScript or CSS
hacks to hide the scrollbar.

```css
.tablist {
  scrollbar-width: none;
}
```

Already this works pretty well for touch devices but horizontal scrolling with a
mouse without a scrollbar is problematic.

### Adding back and forward scroll buttons

Adding buttons to scroll hidden tabs into view takes a fair amount of JavaScript
to calculate how far to scroll, track the scroll position and enable and disable
the buttons when reaching either end of the list. Animating the scroll
complicates things even further.

The scroll-button psuedo-elements handle this for us! To add the buttons we
specify the selectors on the tab list and provide content for the buttons.

```css
.tablist {
  &::scroll-button(inline-start) {
    content: "<";
  }

  &::scroll-button(inline-end) {
    content: ">";
  }
}
```

With a start selector we can apply common styles to the buttons and states
targeted with the usual state selectors.

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

I have to admit that positioning the buttons initially confused me. The buttons
sit inside the scroll area so attempting to position them with Flex Box or Grid
at the start and end means they scroll out of view. Absolute positioning to a
relative parent container works but causes a bit of a pain to get right.

If the tabs sit above the fold (not down the page out of view) then positioning
the buttons with position anchor has some nice features. Giving the tab list an
anchor name allows us to anchor the buttons to the outside of the tab list and
we can center align the buttons with the tabs using anchor-center.

```css
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

When we click the scroll buttons the container jumps to the next position
instantly. To animate the scroll we can apply the `scroll-behavior` property on
the tab list. Setting this to `smooth` adds a smooth transition to the next set
of tabs.

```css
.tablist {
  scroll-behavior: smooth;
}
```

### Putting it all together

When we put the main components together we have a working set scrollable tabs
in less that 20 lines of CSS!

```css
.tablist {
  anchor-name: --tab-list;
  display: flex;
  gap: 0.125rem;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;

  &::scroll-button(*) {
    align-self: anchor-center;
    position: absolute;
    position-anchor: --tab-list;
  }

  &::scroll-button(inline-start) {
    content: "<";
    left: anchor(start);
  }

  &::scroll-button(inline-end) {
    content: ">";
    right: anchor(end);
  }
}
```

<style>
.tablist-wrapper {
  margin: 0 auto 3rem;
  max-width: 600px;
  padding: 0 2rem;
  position: relative;
}

.tablist {
  display: flex;
  gap: 0.125rem;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;

  &::scroll-button(*) {
    background: red;
    color: white;
    position: absolute;
    top: 0;
  }

  &::scroll-button(inline-start) {
    content: "<";
    left: 0;
  }

  &::scroll-button(inline-end) {
    content: ">";
    right: 0;
  }
}

.tab {
  white-space: nowrap;
}
</style>

<div class="tablist-wrapper">
  <div class="tablist" role="tablist">
    <button class="tab" role="tab">Tab one</button>
    <button class="tab" role="tab">Tab two</button>
    <button class="tab" role="tab">Tab three</button>
    <button class="tab" role="tab">Tab four</button>
    <button class="tab" role="tab">Tab five</button>
    <button class="tab" role="tab">Tab six</button>
    <button class="tab" role="tab">Tab seven</button>
    <button class="tab" role="tab">Tab eight</button>
    <button class="tab" role="tab">Tab nine</button>
    <button class="tab" role="tab">Tab ten</button>
    <button class="tab" role="tab">Tab eleven</button>
    <button class="tab" role="tab">Tab twelve</button>
    <button class="tab" role="tab">Tab thirteen</button>
    <button class="tab" role="tab">Tab fourteen</button>
    <button class="tab" role="tab">Tab fifteen</button>
    <button class="tab" role="tab">Tab sixteen</button>
    <button class="tab" role="tab">Tab seventeen</button>
    <button class="tab" role="tab">Tab eighteen</button>
    <button class="tab" role="tab">Tab nineteen</button>
    <button class="tab" role="tab">Tab twenty</button>
  </div>
</div>

[carousel-article]: https://developer.chrome.com/blog/carousels-with-css
[google-io]: https://youtu.be/GSVe6zguiao?si=15-ZnNVwETe4gkra&t=20
[scrollable-tabs]: https://youtu.be/GSVe6zguiao?si=15-ZnNVwETe4gkra&t=20
