---
title: Practical web component reactivity patterns
description:
  The web platform provides us with all the tools we need to apply reactivity to
  our web components. Let's explore some reactive programming patterns we can use
  in everyday scenarios to build interactive web pages and applications.
date: 2024-11-24
tags:
  - posts
  - web
  - web components
  - javascript
  - html
script: /practical-web-component-reactivity-patterns/index.js
social_card: practical-web-component-reactivity-patterns.jpg
---

## Keeping HTML element attributes and properties in sync

If you've worked with HTML elements previously you'll likely be aware that attributes declared
on an element have no default mechanism to reflect their value to properties on the underlying
object in JavaScript. While this [isn't true for all elements and attributes][reflected-attributes]
it makes sense because object properties can represent any type of data and attributes are always
represented as strings. Let's look at how we can keep attribute and property values in sync for
situations that warrant it.

### The HTMLElement dataset

The element [`dataset`][dataset] allows attributes to be set either from HTML in the `data-*`
format or via the object property in JavaScript. Take the `activePage` property of the `PageFlip`
element that we'll cover later in the article as an example. We could use the elements `dataset`
to store it and provide an initial value in the HTML declaration.

```html
<my-page-flip data-active-page="0"></my-page-flip>
```

If we set the value of the active page from JavaScript then it is reflected to the attribute in
the HTML. You'll notice that the conversion between camel casing and hyphens is handled for us
but because the `dataset` is represented as a `DomStringMap` it doesn't provide us any control
over how the values are stored and exposed&mdash;it's always a string.

```js
const flip = document.querySelector("my-page-flip");

flip.dataset.activePage = 1;
// <my-page-flip data-active-page="1"></my-page-flip>
console.log(flip.dataset.activePage);
// "1" (string)
```

This isn't perfect but it works fine for simple scenarios. Let's improve the solution by
defining our own custom attribute and property.

### Custom element attributes and properties

Rather than use the element `dataset` we can implement our own attributes and provide getter
and setter functions to expose them as properties. Doing this provides us with full control over
how the data is stored, provides better encapsulation and more control over how the element will
react to changes. To implement this reactivity pattern we will observe attributes for changes by
listing them in the static `observedAttributes` property (this could be applied to `data-*`
attributes too). We then implement the [`attributeChangedCallback`][attribute-changes] method to
be notified about value changes and update the state accordingly.

Here's an example of this in the `PageFlip` element. We only want to update the attribute value
in the HTML if it is already declared by conditionally calling `setAttribute` from the setter
function and letting the callback handle updating the property value.

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
    // ...run animation so show page
    this.#activePage = pageIndex;
  }
}
```

## Reacting to changes in sub-components

Custom elements ([Web Components][web-components], I'll refer to them as components for the rest of
the article) can define [slots][templates-and-slots] to inject content into the component tree at
specified locations. I won't include the full implementation of each component here but you can
[view the code][code-examples] for the examples. When the element or elements in the slot update
we may need to react to this change, let's explore some ways to deal with this reactivity pattern.

We'll implement a pagination component that provides controls for navigating through a list of pages.
It'll need a template that defines the structure of the component with a default slot (the one that
isn't named) to hold the pages, buttons to navigate to the next and previous page and a status
indicator that displays the acttive page number alongside the total number of pages.

```html
<template id="pagination-tmpl">
  <div id="pages">
    <slot><!-- default slot --></slot>
  </div>
  <div id="status"><!-- Page 1 of n --></div>
  <div id="controls">
    <button id="prev" aria-controls="pages">Previous</button>
    <button id="next" aria-controls="pages">Next</button>
  </div>
</template>
```

The component needs to react to changes in the default slot to set the total number of pages in the
status label. It also needs to set and show the active page when pressing the buttons to navigate.

### Using the slotchange event to react to updates

Whenever elements are assigned to a slot a `slotchange` event is dispatched. By adding an event
listener for these we can update the status indicator to show the total number of pages. This may
only happen once when the document is first loaded or multiple times depending on how the pages
are displayed.

Let's start with a basic implementation of the pagination component. We'll add an event listener for
the slot change and display the active page by setting the CSS display property of the pages.

```js
class Pagination extends HTMLElement {
  // Currently selected page index
  #selectedPageIndex = 0;

  // Page selection indicator reference
  #selectionIndicator = null;

  // List of the page elements in the default slot
  #pages = null;

  connectedCallback() {
    // ...attach shadow root, apply the template and add button event listeners

    // Store a reference to the selected page indicator
    this.#selectionIndicator = this.shadowRoot.getElementById("status");

    // Listen for slot changes to store reference to the pages elements
    // and set the active page
    this.shadowRoot
      .querySelector("slot")
      .addEventListener("slotchange", (ev) => {
        this.#pages = ev.target.assignedElements();
        // Start by hiding all pages
        this.#pages.forEach((page) =>
          page.style.setProperty("display", "none"),
        );
        this.#setSelectedPage(this.#selectedPageIndex);
      });
  }

  #setSelectedPage(pageIndex) {
    // Display only the active page
    this.#pages[this.#selectedPageIndex]?.style.setProperty("display", "none");
    this.#pages[pageIndex]?.style.setProperty("display", "block");

    // Store the new active page index
    this.#selectedPageIndex = pageIndex;

    // Update indicator to show selected page
    this.#selectionIndicator.textContent = `Page ${pageIndex + 1} of ${this.#pages.length}`;
  }
}
```

<div class="code-demo">
  <my-pagination class="pagination" aria-roledescription="carousel" aria-label="Example pagination container">
    <div class="page" role="group">Page one</div>
    <div class="page" role="group">Page two</div>
    <div class="page" role="group">Page three</div>
  </my-pagination>
</div>

This already works well to update the status indicator and display the active page. Next we'll add a
component that animates the page changes and look at how we handle inter-component reactivity.

### Using events for web component interactivity

If we move the responsibility of displaying the active page with an animation to a new `PageFlip`
component we'll need it to provide a way to notify the `Pagination` component of changes to update
the status indicator.

The `PageFlip` component will expose an `activePage` property (we saw this earlier) to control thie
visible page when the navigation buttons are clicked. For the reactivity pattern we'll use a
[custom event][custom-event] named `pagechange` that is dispatched when the active page or total
number of pages changes. The event is set to bubble so we can apply the listener to the slot
element and not to the `PageFlip` component directly.

```js
export class PageFlip extends HTMLElement {
  //... getter, setters and lifecycle methods

  #setActivePage(pageIndex) {
    // ...animate page into view

    // Store new page index and dispatch event
    this.#activePage = pageIndex;
    this.dispatchEvent(
      new CustomEvent("pagechange", {
        bubbles: true,
        detail: {
          activePage: this.activePage, // the property synced with active-page attribute
          totalPages: this.length, // property that exposes the number of page (children)
        },
      }),
    );
  }
}
```

Adding the page flip means the default slot now plays host to this component and the slot change event
we used previously will be dispatched only when this element is assigned.

```html
<my-pagination>
  <my-page-flip active-page="0">
    <div>Page one</div>
    <div>Page two</div>
    <div>Page three</div>
  </my-page-flip>
</my-pagination>
```

We'll update the `Pagination` component to remove the page display functionality and add the `pagechange`
event listener. This component is simpler now and only responsible for navigating pages and setting the
status indicator label.

```js
class Pagination extends HTMLElement {
  // Page selection indicator
  #selectionIndicator = null;

  // Animation container reference
  #animationContainer = null;

  connectedCallback() {
    // ...attach shadow root, apply the template and add button event listeners to set activePage

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

Events are fundamental to how we build user interfaces on the web with all kinds of existing events. By
applying this pattern to our own components we are able to split our applications into discrete parts that
can be combined together to create rich user experiences.

### Using a MutationObserver to react to sub component updates

Sometimes, we might not have an event like `pagechange` available. Maybe we have to deal with
integrating a new feature into a legacy codebase or use a third party library we have no control
over. In these scenarios we can achieve a similar result with a [`MutationObserver`][mutation-observer]
to observe changes to the attributes and children of the element.

This approach here will rely on the `active-page` attribute correctly reflecting the `activePage`
property value and some confidence that the list of pages are the elements direct children (although,
we could also apply the observer to the entire element subtree).

Here's what the `Pagination` component would look like if we updated it to use a `MutationObserver` to
control the status indicator instead of the `pagechange` event.

```js
class Pagination extends HTMLElement {
  // Page selection indicator
  #selectionIndicator = null;

  // Animation container reference
  #animationContainer = null;

  // Mutation observer reference
  #observer = null;

  constructor() {
    super();

    // On mutations update the selected page status
    this.#observer = new MutationObserver(() => {
      this.#setSelectedPage();
    });
  }

  connectedCallback() {
    // ...attach shadow root, apply the template and add button event listeners to set activePage

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("status");

    // Listen for slot changes to store reference to the page flip component
    // and observe for mutations within it
    shadow.querySelector("slot").addEventListener("slotchange", (ev) => {
      // Remove any previous observerations
      this.#observer.disconnect();

      this.#animationContainer = ev.target.assignedElements()[0];
      // Add the element to the observer for active-page attribute
      // and child list updates
      this.#observer.observe(this.#animationContainer, {
        attributes: true,
        attributeFilter: ["active-page"],
        childList: true,
      });

      this.#setSelectedPage();
    });
  }

  // Update the page status using the page flip component state
  #setSelectedPage() {
    const page = this.#animationContainer.activePage + 1;
    const totalPages = this.#animationContainer.length;

    this.#selectionIndicator.textContent = `Page ${page} of ${totalPages}`;
  }
}
```

## Takeaway

Custom events are a power tool for implementing components that both work in isolation and can be combined to
create dynamic applications for the web. Consider also the encapsulation of state through the use of custom
property getters and setters and a pragmatic approach of reflecting this to attribute values and we have some
solid patterns for adding reactivity to our component development.

[code-examples]: https://github.com/p-m-p/p-m-p.github.io/tree/main/js/practical-web-component-reactivity-patterns
[reflected-attributes]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#content_versus_idl_attributes
[attribute-changes]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#responding_to_attribute_changes
[templates-and-slots]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots
[dataset]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
[code-examples]: https://github.com/p-m-p/p-m-p.github.io/tree/main/js/practical-web-component-reactivity-patterns
[web-components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
[custom-event]: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
[mutation-observer]: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

<style>
.pagination {
  height: 300px;
  margin: 0 0 1rem;
  &:not(:defined) {
    display: none;
  }
}
.page {
  align-items: center;
  background: white;
  border: solid 2px gray;
  color: black;
  font-weight: bold;
  inset: 0;
  justify-content: center;
  padding: 1rem;
  position: absolute;
  z-index; 1;
  &:nth-child(1) {
    z-index: 2;
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
      gap:0.5rem;
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
    button {
      background: light-dark(rgb(255 255 255 / 50%), rgb(255 255 255 / 10%));
      border: solid 1px light-dark(rgb(0 0 0 / 20%), rgb(255 255 255 / 20%));
      border-radius: 0.25rem;
      color: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      margin: 0 0 0 0.5rem;
      padding: 0.5rem 1rem;
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
