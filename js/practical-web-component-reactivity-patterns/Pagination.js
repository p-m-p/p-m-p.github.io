export class Pagination extends HTMLElement {
  // State of the currently selected page index
  #selectedPageIndex = 0;

  // Page selection indicator
  #selectionIndicator = undefined;

  // NodeList of the pages in the default slot
  #pages = undefined;

  connectedCallback() {
    // Attach a shadow root using the template
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.querySelector("#pagination-tmpl");

    shadow.append(template.content.cloneNode(true));

    // Store a reference to the selected page indicator
    this.#selectionIndicator = shadow.querySelector("#status");

    // Listen for slot changes to store reference to the pages and
    // set the initial state of the page selection status
    shadow.querySelector("slot").addEventListener("slotchange", (ev) => {
      this.#pages = ev.target.assignedElements();
      // Start by hiding all pages
      for (const page of this.#pages) page.style.setProperty("display", "none");
      this.#setSelectedPage(0);
    });

    // Add event listeners for pagination buttons
    shadow.querySelector("#prev").addEventListener("click", () => {
      if (this.#selectedPageIndex > 0) {
        this.#setSelectedPage(this.#selectedPageIndex - 1);
      }
    });
    shadow.querySelector("#next").addEventListener("click", () => {
      const nextPage = this.#selectedPageIndex + 1;

      if (nextPage < (this.#pages?.length ?? 0)) {
        this.#setSelectedPage(nextPage);
      }
    });
  }

  #setSelectedPage(pageIndex) {
    // Display only page index
    this.#pages[this.#selectedPageIndex]?.style.setProperty("display", "none");
    this.#pages[pageIndex]?.style.setProperty("display", "block");

    // Store the new page index
    this.#selectedPageIndex = pageIndex;

    // Update indicator to show selected page
    this.#selectionIndicator.textContent = `Page ${pageIndex + 1} of ${this.#pages.length}`;
  }
}
