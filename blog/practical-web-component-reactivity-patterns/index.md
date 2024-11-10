---
title: Practical web component reactivity patterns
description:
  Custom elements have a great API for handling updates to attributes and sub components.
  Let's take a look at some patterns we can apply to common use cases for dealing with
  reactivity in our websites and applications.
date: 2024-10-31
draft: true
---

## Keeping HTML element attributes and properties in sync

If you've done any work with HTML elements previously you'll likely have run into
this quirk early on, especially if using your own Web Components within a framework
like Svelte or Vue.js. When we define attributes on an element there is no default
mechanism to map these to properties on the underlying object reference.

Consider the size attribute on this `my-button` component.

```html
<my-button size="small">Click me!</my-button>
```

We can only get and set the value of size via the attribute but there is no matching
property.

```js
const myButton = document.querySelector("my-button");

console.log(myButton.getAttribute("size")); //=> "small"
console.log(myButton.size); //=> undefined
```

To implement a getter for the size property we want to store the attribute value, if
set, in state and use this to provide the value. To keep this internal state up to
date with any update to the attribute we will observe the value by adding it to the
`observedAttributes` list and handling updates in the `attributeChangedCallback` method.

```js
class Button extends HTMLElement {
  // Observe changes to size attribute
  static observedAttributes = ["size"];

  // Initialize the size state with a default
  #size = "medium";

  // Getter for the size property (myButton.size)
  get size() {
    return this.#size;
  }

  // Update the value of size in component state when attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "size") {
      this.#size = newValue;
    }
  }
}
```

Now to implement the setter for the size property we can check if size was originally set
via the attribute and either update that value or just set the internal state.

```js
class MyButton extends HTMLElement {
  //... Previous example omitted

  set size(newValue) {
    // Attribute value is already set so update it and allow
    // observed attribute to update internal state
    if (this.hasAttribute("size")) {
      this.setAttribute("size", newValue);
    }
    // Attribute isn't set so update internal state directly
    else {
      this.#size = newValue;
    }
  }
}
```

## Reacting to changes in sub-components

Components that utilise the Shadow DOM have the option of defining slots that place user defined
content into the component tree.

Take this example of component that provides controls for pagination between pages of content.
We define a template that provides a default slot for the pages along with buttons to move
forwards and backwards through each page and a status label that indicates the selected page
in the number of available pages.

<div class="note alert">
  The code examples here are not intended for production use. Error handling and the addition
  of appropriate ARIA attributes have been omitted for brevity but can be seen in the links
  to the full code samples provided.
</div>

```html
<template id="pagination-tmpl">
  <div id="pages">
    <slot></slot>
  </div>
  <div id="page-selection"><!-- Page 1 of n --></div>
  <div id="page-controls">
    <button id="prev" aria-controls="pages">Previous</button>
    <button id="next" aria-controls="pages">Next</button>
  </div>
</template>
```

### Using the slotchange event to react to sub component updates

When we construct the component we apply an event listener for changes to the default slot and
set the page selection indicator state. Event handlers are added to the buttons to navigate the
pages by toggling their display value.

```js
class Pagination extends HTMLElement {
  // Currently selected page index
  #selectedPageIndex = 0;

  // Page selection indicator reference
  #selectionIndicator = null;

  // List of the page elements in the default slot
  #pages = null;

  constructor() {
    super();

    // Attach a shadow root and append the pagination template content
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById("pagination-tmpl");
    shadow.appendChild(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("page-selection");

    // Listen for slot changes to store reference to the pages elements
    // and set the page selection status
    shadow.querySelector("slot").addEventListener("slotchange", (ev) => {
      this.#pages = ev.target.assignedElements();
      this.#setSelectedPage(this.#selectedPageIndex);
    });

    // Add event listeners for pagination buttons to show next/previous page
    shadow.getElementById("prev").addEventListener("click", () => {
      if (this.#selectedPageIndex > 0) {
        this.#setSelectedPage(this.#selectedPageIndex - 1);
      }
    });
    shadow.getElementById("next").addEventListener("click", () => {
      const nextPage = this.#selectedPageIndex + 1;

      if (nextPage < (this.#pages?.length ?? 0)) {
        this.#setSelectedPage(nextPage);
      }
    });
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

If we introduce another component that handles the page changes with an animation
we will need to deal with the slot change scenario a little differently.

### Using events for web component interactivity

Let's introduce a `my-page-flip` element that will show the active page by way of a nice animation.
It has a single attribute `active-page` and when this or the list of pages within is updated it
dispatches a `pagechange` event.

```html
<my-pagination>
  <!-- animation component -->
  <my-page-flip active-page="0">
    <div>Page one</div>
    <div>Page two</div>
    <div>Page three</div>
  </my-page-flip>
</my-pagination>
```

There will still be a `slotchange` event when the pagination component first connects but any
updates to the pages inside the animation element will not trigger further `slotchange` events.

As the animation element dispatches an event anytime the page state is updated we can listen
for this and update the status indicator accordingly.

```js
class PageFlip extends HTMLElement {
  static observedAttributes = ["active-page"];

  #activePage = 0;
  #pages = null;

  get length() {
    return this.#pages?.length ?? 0;
  }

  get activePage() {
    return this.#activePage;
  }

  set activePage(pageIndex) {
    if (this.hasAttribute("active-page")) {
      this.setAttribute("active-page", pageIndex);
    } else {
      this.#setActivePage(pageIndex);
    }
  }

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    const slot = document.createElement("slot");

    shadow.appendChild(slot);

    slot.addEventListener("slotchange", (ev) => {
      this.#pages = ev.target.assignedElements();
      this.#setActivePage(0);
    });
  }

  attributeChangedCallback(name, _, newValue) {
    if (name === "active-page") {
      this.#setActivePage(parseInt(newValue, 10));
    }
  }

  #setActivePage(pageIndex) {
    this.#activePage = pageIndex;

    if (this.#pages) {
      this.#pages.forEach((page, index) => {
        page.style.setProperty(
          "display",
          index === pageIndex ? "block" : "none",
        );
      });

      this.dispatchEvent(
        new CustomEvent("pagechange", {
          bubbles: true,
          detail: {
            activePage: this.activePage,
            totalPages: this.length,
          },
        }),
      );
    }
  }
}
```

The pagination element is simplified to listen for this event and update the active page status.
Navigating pages is updated to use the active page property when then next and previous buttons
are pressed.

```js
class Pagination extends HTMLElement {
  // Page selection indicator
  #selectionIndicator = null;

  // Animation container reference
  #animationContainer = null;

  constructor() {
    super();

    // Attach a shadow root using the template
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById("pagination-tmpl");

    shadow.appendChild(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("page-selection");

    const slot = shadow.querySelector("slot");

    // Listen for slot changes to store reference to the animation container
    slot.addEventListener("slotchange", (ev) => {
      this.#animationContainer = ev.target.assignedElements()[0];
    });

    // Event listener for page change events to update the status indicator
    slot.addEventListener("pagechange", (ev) => {
      const { activePage, totalPages } = ev.detail;

      this.#selectionIndicator.textContent = `Page ${activePage + 1} of ${totalPages}`;
    });

    // Add event listeners for pagination buttons
    shadow.getElementById("prev").addEventListener("click", () => {
      const activePage = this.#animationContainer.activePage;

      if (activePage > 0) {
        this.#animationContainer.activePage = activePage - 1;
      }
    });
    shadow.getElementById("next").addEventListener("click", () => {
      const nextPage = this.#animationContainer.activePage + 1;

      if (nextPage < this.#animationContainer.length) {
        this.#animationContainer.activePage = nextPage;
      }
    });
  }
}
```

This is a nice pattern for handling the interactions between the components. However, in real
world scenarios we might not an event available, perhaps if we are using third party animation
library we have no control over.

### Using a MutationObserver to react to sub component updates

Without the event we can achieve similar results to the `slotchange` event example with a
`MutationObserver` object that observes attribute and child list mutations on the animation
container. When the `active-page` attribute or list of pages updates we react by setting the
status indicator to show the currently selected page status.

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

    // Attach a shadow root using the template
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById("pagination-tmpl");

    shadow.appendChild(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("page-selection");

    // On mutations update the selected page status
    this.#observer = new MutationObserver(() => {
      this.#setSelectedPage();
    });

    // Listen for slot changes to store reference to the animation container
    // and observe for mutations within it
    shadow.querySelector("slot").addEventListener("slotchange", (ev) => {
      // Clean up from any previous slot updates
      this.#observer.disconnect();

      this.#animationContainer = ev.target.assignedElements()[0];
      this.#observer.observe(this.#animationContainer, {
        attributes: true,
        childList: true,
      });

      this.#setSelectedPage();
    });

    // Add event listeners for pagination buttons
    shadow.getElementById("prev").addEventListener("click", () => {
      const activePage = this.#animationContainer.activePage;

      if (activePage > 0) {
        this.#animationContainer.activePage = activePage - 1;
      }
    });
    shadow.getElementById("next").addEventListener("click", () => {
      const nextPage = this.#animationContainer.activePage + 1;

      if (nextPage < this.#animationContainer.length) {
        this.#animationContainer.activePage = nextPage;
      }
    });
  }

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
