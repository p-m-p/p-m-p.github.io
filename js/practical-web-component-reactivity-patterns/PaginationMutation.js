export class PaginationMutation extends HTMLElement {
  // Page selection indicator
  #selectionIndicator = null;

  // Animation container reference
  #animationContainer = null;

  // Mutation observer reference
  #observer = null;

  constructor() {
    super();

    this.#observer = new MutationObserver(() => {
      this.#setSelectedPage();
    });
  }

  connectedCallback() {
    // Attach a shadow root using the template
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById("pagination-tmpl");

    shadow.appendChild(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("status");

    // Listen for slot changes to store reference to the animation container
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

  disconnectedCallback() {
    this.#observer.disconnect();
  }
}
