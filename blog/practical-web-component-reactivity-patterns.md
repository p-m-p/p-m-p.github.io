---
title: Practical web component reactivity patterns
description:
  Web components and the DOM have mature APIs for handling updates to attributes and
  sub components. Let's take a look at some patterns we can apply to common use cases
  for dealing with reactivity in our websites and applications.
date: 2024-10-31
draft: true
script: /practical-web-component-reactivity-patterns/index.js
---

## Keeping HTML element attributes and properties in sync

If you've worked with HTML elements previously you'll likely be aware that
attributes defined on an element have no default mechanism to reflect their
value to properties on the underlying element object. While this isn't
true for all elements and attributes it does make sense as the property can
take any value and attributes are represented as strings. Let's look at a
couple approaches to keeping attributes and properties in sync.

### HTMLElement dataset

The element `dataset` allows attribute values to be set either from the HTML
or the object property via JavaScript.

Take the `activePage` property of the `PageFlip` element we'll see later
in the article as an example. We can set an initial value of the attribute
in the HTML declaration.

```html
<my-page-flip data-active-page="0"></my-page-flip>
```

And update both the attribute value and the object property by updating the
value from JavaScript. You'll notice that the conversion from camel casing
to hyphens is handled for us.

```js
const flip = document.querySelector("my-page-flip");

flip.dataset.activePage = 1;
// <my-page-flip data-active-page="1"></my-page-flip>
```

This works but `dataset` is a `DomStringMap` that doesn't provide any control
over how the values are stored and exposed. Changes to the attribute value can
be observed by adding it to the elements `observedAttributes` and implementing
the `attributeChangedCallback` method that we'll see next or we can implement
our own properties.

### Element attributes and properties

Rather than rely on the elements `dataset` we can implement our own attributes
and provide getter and setter functions to expose them as properties in the correct
data format. Attribute values can be observed for changes in the `attributeChangedCallback`
method and the setter function is used to update the value from JavaScript.

Depending on the significance of the attribute value in the HTML it may make sense to
update this value when the property is changed from JavaScript. This is achieved here by
conditionally calling `setAttribute` if the attribute is already present in the HTML and
letting the callback update the element property state.

```js
class PageFlip extends HTMLElement {
  // Observe changes to active-page attribute
  static observedAttributes = ["active-page"];

  // Initialize the state with a default value
  #activePage = 1;

  // Getter for the active page property
  get activePage() {
    return this.#activePage;
  }

  // Setter for the active page
  set activePage(pageIndex) {
    // If the attribute is set update it and let callback update state
    if (this.hasAttribute("active-page")) {
      this.setAttribute("active-page", pageIndex);
    }
    // No attribute set so just update state directly
    else {
      this.#setActivePage(pageIndex);
    }
  }

  // Update the value of the property when the attribute value changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "active-page" && oldValue !== newValue) {
      this.#setActivePage(parseInt(newValue, 10));
    }
  }

  #setActivePage(pageIndex) {
    this.#activePage = pageIndex;
    // ...run animation so show page
  }
}
```

There's performance considerations here if the value is updated often or in many places as the
`attributeChangedCallback` will be run synchronously when the property is updated.

## Reacting to changes in sub-components

Custom elements ([Web Components][web-components], I'll refer to them as components for the rest of
the article) that utilise the Shadow DOM can define slots to place user defined content into the
component sub tree at specified locations.

Let's implement a component that provides controls for paginating between a list of pages. We'll
use a template to define a structure that contains a default slot for the pages, buttons to navigate
forwards and backwards through the pages and a status indicator that displays the selected page number
with the total number of available pages.

```html
<template id="pagination-tmpl">
  <div id="pages">
    <slot></slot>
  </div>
  <div id="status"><!-- Page 1 of n --></div>
  <div id="controls">
    <button id="prev" aria-controls="pages">Previous</button>
    <button id="next" aria-controls="pages">Next</button>
  </div>
</template>
```

The component implementation needs to react to changes in the default slot to display the total
number of pages in the status label and apply event handlers to the buttons to toggle the display
of pages.

### Using the slotchange event to react to sub component updates

By adding an event listener for `slotchange` events on the slot element we can update the status indicator
to show the total number of pages any time the elements assigned to the slot are changed. This may only
happen once when the page is first rendered or there could be some dynamic loading of the pages that causes
additional events to be dispatched, maybe selecting a different category or filtering the content in some
way.

A simple implementation of the pagination component displays only the current page using the CSS display
property as shown below. Only relevant code has been included, full implementation of the examples in this
article can be [viewed on Github][code-examples] but may not be appropriate for production use.

```js
class Pagination extends HTMLElement {
  // Currently selected page index
  #selectedPageIndex = 0;

  // Page selection indicator reference
  #selectionIndicator = null;

  // List of the page elements in the default slot
  #pages = null;

  connectedCallback() {
    // .,.attach shadow root and apply template

    // Store a reference to the selected page indicator
    this.#selectionIndicator = this.shadowRoot.getElementById("status");

    // Listen for slot changes to store reference to the pages elements
    // and set the page selection status
    this.shadowRoot
      .querySelector("slot")
      .addEventListener("slotchange", (ev) => {
        this.#pages = ev.target.assignedElements();
        this.#setSelectedPage(this.#selectedPageIndex);
      });

    // ...add button event listeners
  }

  #setSelectedPage(pageIndex) {
    // Store the new page index
    this.#selectedPageIndex = pageIndex;

    // Show only the current page
    this.#pages.forEach((page, index) => {
      page.style.setProperty("display", index === pageIndex ? "block" : "none");
    });

    // Update indicator to show selected page
    this.#selectionIndicator.textContent = `Page ${pageIndex + 1} of ${this.#pages.length}`;
  }
}
```

<style>
.pagination {
  max-width: 400px;
  height: 400px;
  margin: 0 auto;
}
.page {
  align-items: center;
  color: black;
  font-weight: bold;
  inset: 0;
  justify-content: center;
  padding: 1rem;
  position: absolute;
  z-index; 1;
  &:nth-child(1) {
    background: lightsalmon;
    z-index: 2;
  }
  &:nth-child(2) {
    background: cornsilk;
  }
  &:nth-child(3) {
    background: powderblue;
  }
}
my-page-flip {
  display: block;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
<template id="pagination-tmpl">
  <style>
    :host {
      display: grid;
      grid-template:
        "pages pages" 1fr
        "status controls" auto;
      gap: 0.5rem;
      padding: 1rem;
    }
    #pages {
      grid-area: pages;
      position: relative;
    }
    #status {
      align-self: center;
      font-size: 0.875rem;
      grid-area: status;
      justify-self: left;
    }
    #controls {
      grid-area: controls;
      justify-self: right;
    }
  </style>
  <div id="pages">
    <slot></slot>
  </div>
  <div id="status"><!-- Page 1 of n --></div>
  <div id="controls">
    <button id="prev" aria-controls="pages">Previous</button>
    <button id="next" aria-controls="pages">Next</button>
  </div>
</template>
<div class="code-demo">
  <my-pagination class="pagination" aria-roledescription="carousel" aria-label="Example pagination container">
    <div class="page" role="group">Page one</div>
    <div class="page" role="group">Page two</div>
    <div class="page" role="group">Page three</div>
  </my-pagination>
</div>

Slot change events work well enough in this scenario but if we introduce the `PageFlip` component we saw earlier
to animate the page changes we'll need a way to communicate updates between components.

### Using events for web component interactivity

Moving the responsibility of displaying the active page to the `PageFlip` component means there needs to be
some way to notify the pagination component of the page state so that the status label can be updated. The
`activePage` property will be used to navigate and a custom `pagechange` event will be dispatched any time
the active page or total number of pages changes.

The default slot now hosts the animation component and its pages.

```html
<my-pagination>
  <my-page-flip active-page="0">
    <div>Page one</div>
    <div>Page two</div>
    <div>Page three</div>
  </my-page-flip>
</my-pagination>
```

An event listener for the `pagechange` event is applied to the default slot and updates the active page
status. Navigating pages on the next and previous buttons is updated to use the active page property, see
the full code example for reference.

```js
class Pagination extends HTMLElement {
  // Page selection indicator
  #selectionIndicator = null;

  // Animation container reference
  #animationContainer = null;

  connectedCallback() {
    // ...attach shadow root and apply the template

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("status");

    const slot = shadow.querySelector("slot");

    // Listen for slot changes and store reference to the animation container
    slot.addEventListener("slotchange", (ev) => {
      this.#animationContainer = ev.target.assignedElements()[0];
    });

    // Event listener for page change events to update the status indicator
    slot.addEventListener("pagechange", (ev) => {
      const { activePage, totalPages } = ev.detail;

      this.#selectionIndicator.textContent = `Page ${activePage + 1} of ${totalPages}`;
    });
  }
}
```

<my-pagination-event class="pagination" aria-roledescription="carousel" aria-label="Example pagination container with animation">
  <my-page-flip active-page="0">
    <div class="page" role="group">Page one</div>
    <div class="page" role="group">Page two</div>
    <div class="page" role="group">Page three</div>
  </my-page-flip>
</my-pagination-event>

Using this custom event provides a clear line of communication between the components with minimal coupling.

### Using a MutationObserver to react to sub component updates

In real world scenarios there might not be an event like the `pagechange` available, perhaps if using
third party animation library or some legacy code within an organisation.

To achieve a similar result in the absence of an event a `MutationObserver` can be used to observe changes
to the attributes and child list of the `PageFlip` component. Whenever the `active-page` attribute or the list
of pages update a callback function updates the status indicator to show the current page status.

```js
class Pagination extends HTMLElement {
  // Page selection indicator
  #selectionIndicator = null;

  // Animation container reference
  #animationContainer = null;

  // Mutation observer reference
  #observer = null;

  connectedCallback() {
    // ...attach a shadow root and apply the template

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("status");

    // On mutations update the selected page status
    this.#observer = new MutationObserver(() => {
      this.#setSelectedPage();
    });

    // Listen for slot changes to store reference to the page flip component
    // and observe for mutations within it
    shadow.querySelector("slot").addEventListener("slotchange", (ev) => {
      // Remove any previous observerations
      this.#observer.disconnect();

      this.#animationContainer = ev.target.assignedElements()[0];
      this.#observer.observe(this.#animationContainer, {
        attributes: true,
        childList: true,
      });

      this.#setSelectedPage();
    });
  }

  // Update the page status using the page flip container state
  #setSelectedPage() {
    const page = this.#animationContainer.activePage + 1;
    const totalPages = this.#animationContainer.length;

    this.#selectionIndicator.textContent = `Page ${page} of ${totalPages}`;
  }

  // Disconnect the mutation observer when the element is removed
  disconnectedCallback() {
    this.#observer.disconnect();
  }
}
```

<my-pagination-mutation class="pagination" aria-roledescription="carousel" aria-label="Example pagination container with animation">
  <my-page-flip active-page="0">
    <div class="page" role="group">Page one</div>
    <div class="page" role="group">Page two</div>
    <div class="page" role="group">Page three</div>
  </my-page-flip>
</my-pagination-mutation>

[code-examples]: https://github.com/p-m-p/p-m-p.github.io/tree/main/js/practical-web-component-reactivity-patterns
[web-components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
