---
title: Practical Web Component reactivity patterns
description:
  As a primitive, Web components have a pretty good API for managing updates
  to attributes and sub components. Let's take a look at some patterns to
  deal with some of the edge cases that come with this.
date: 2024-10-31
draft: true
---

## Keeping attributes and properties in sync

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
  //... See example above

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

## Handling changes to sub-components

Components that utilise the Shadow DOM have the option of defining slots that place user defined
content into the component tree.

Take this example of component that provides controls for pagination between elements, pages. We
define a template that provides a default slot for the pages along with buttons to move forwards
and backwards through each page and a status label that indicates the selected page in the number
of available pages.

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

When we construct the component we apply an event listener for changes to the default slot and
set the initial page selection indicator state.

```js
class Pagination extends HTMLElement {
  // State of the currently selected page index
  #selectedPageIndex = 0;

  // Page selection indicator
  #selectionIndicator = null;

  // NodeList of the pages in the default slot
  #pages = null;

  constructor() {
    super();

    // Attach a shadow root using the template
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById("pagination-tmpl");

    shadow.appendChild(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("page-selection");

    // Listen for slot changes to store reference to the pages and
    // set the initial state of the page selection status
    shadow.querySelector("slot").addEventListener("slotchange", (ev) => {
      this.#pages = ev.target.assignedElements();
      this.#setSelectedPage(0);
    });

    // Add event listeners for pagination buttons
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
    this.#selectedPageIndex = pageIndex;

    // Update indicator to show selected page
    this.#selectionIndicator.textContent = `Page ${pageIndex + 1} of ${this.#pages.length}`;

    // Display only the current page
    this.#pages.forEach((page, index) => {
      page.style.setProperty("display", index === pageIndex ? "block" : "none");
    });
  }
}
```
