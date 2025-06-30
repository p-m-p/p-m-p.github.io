export class PaginationEvent extends HTMLElement {
  // Page selection indicator
  #selectionIndicator = undefined;

  // Animation container reference
  #animationContainer = undefined;

  connectedCallback() {
    // Attach a shadow root using the template
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.querySelector("#pagination-tmpl");

    shadow.append(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.querySelector("#status");

    const slot = shadow.querySelector("slot");

    // Listen for slot changes to store reference to the animation container
    slot.addEventListener("slotchange", (ev) => {
      this.#animationContainer = ev.target.assignedElements()[0];
      this.#selectionIndicator.textContent = `Page ${this.#animationContainer.activePage + 1} of ${this.#animationContainer.length}`;
    });

    // Event listener for page change events to update the status indicator
    slot.addEventListener("pagechange", (ev) => {
      const { activePage, totalPages } = ev.detail;

      this.#selectionIndicator.textContent = `Page ${activePage + 1} of ${totalPages}`;
    });

    // Add event listeners for pagination buttons
    shadow.querySelector("#prev").addEventListener("click", () => {
      const activePage = this.#animationContainer.activePage;

      if (activePage > 0) {
        this.#animationContainer.activePage = activePage - 1;
      }
    });
    shadow.querySelector("#next").addEventListener("click", () => {
      const nextPage = this.#animationContainer.activePage + 1;

      if (nextPage < this.#animationContainer.length) {
        this.#animationContainer.activePage = nextPage;
      }
    });
  }
}
