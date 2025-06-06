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
    gap: 0.5rem;
    overflow-x: auto;
    width: 100%;
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
sit inside the scroll area so attempting to position them at the start and end
means they scroll out of view. Use of absolute positioning to a relative parent
container works, but position anchor works super nicely here.

Giving the tab list an anchor name allows us to anchor the buttons to the
outside of the tab list. We can even align them with the tab list using the
anchor, mind blown.

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

[carousel-article]: https://developer.chrome.com/blog/carousels-with-css
[google-io]: https://youtu.be/GSVe6zguiao?si=15-ZnNVwETe4gkra&t=20
[scrollable-tabs]: https://youtu.be/GSVe6zguiao?si=15-ZnNVwETe4gkra&t=20
