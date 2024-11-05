---
title: Practical Web Component reactivity patterns
description:
  As a primitive, Web components have a pretty good API for managing updates
  to attributes and sub components. Let's take a look at some patterns to
  deal with some of the edge cases that come with this.
date: 2024-10-31
draft: true
---

## Keeping attributes in sync with props

If you've done any work with raw Elements previously you'll likely have run into
this quirk early on, especially if using your own Web Components them within a
framework like Svelte or Vue.js. When we define attributes on an element there
is no default mechanism to map these to properties on the underlying object
reference.

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
class MyButton extends HTMLElement {
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
