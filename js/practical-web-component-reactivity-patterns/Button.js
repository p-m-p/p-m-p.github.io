export class Button1 extends HTMLElement {
  // Observe changes to size attribute
  static observedAttributes = ["size"];

  // Initialize the size state with a default
  #size = "medium";

  // Getter for the size property (myButton.size)
  get size() {
    return this.#size;
  }

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

  // Update the value of size in component state when attribute changes
  attributeChangedCallback(name, _, newValue) {
    if (name === "size") {
      this.#size = newValue;
    }
  }
}

export class Button extends HTMLElement {
  // Observe changes to size attribute
  static observedAttributes = ["size"];

  // Initialize the size state with a default
  #state;

  constructor() {
    super();

    this.#state = new Map([["size", "medium"]]);
  }

  // Getter for the size property (myButton.size)
  get size() {
    return this.#state.get("size");
  }

  set size(newValue) {
    // Attribute value is already set so update it and allow
    // observed attribute to update internal state
    if (this.hasAttribute("size")) {
      this.setAttribute("size", newValue);
    }
    // Attribute isn't set so update internal state directly
    else {
      this.#state.set("size", newValue);
    }
  }

  // Update the value of size in component state when attribute changes
  attributeChangedCallback(name, _, newValue) {
    this.#state.set(name, newValue);
  }
}
