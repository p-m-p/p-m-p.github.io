export class Pagination extends HTMLElement {
  // State of the currently selected page index
  #selectedPageIndex = 0;

  // Page selection indicator
  #selectionIndicator = null;

  // NodeList of the pages in the default slot
  #pages = null;

  connectedCallback() {
    // Attach a shadow root using the template
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById("pagination-tmpl");

    shadow.appendChild(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.getElementById("status");

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
