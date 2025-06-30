export class PageFlip extends HTMLElement {
  static observedAttributes = ["active-page"];

  #activePage = 0;

  get length() {
    return this.children.length;
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

  attributeChangedCallback(name, _, newValue) {
    if (name === "active-page") {
      this.#setActivePage(Number.parseInt(newValue, 10));
    }
  }

  #setActivePage(pageIndex) {
    if (pageIndex === this.activePage) {
      return;
    }

    for (const page of this.children) {
      page.style.setProperty("z-index", "1");
    }

    this.children.item(this.activePage).style.setProperty("z-index", "2");

    const page = this.children.item(pageIndex);
    page.style.setProperty("z-index", "3");
    page.animate(
      {
        transform: [
          pageIndex > this.activePage
            ? "translateX(100%)"
            : "translateX(-100%)",
          "translateX(0)",
        ],
        opacity: [0, 0.2, 0.5, 1],
      },
      { duration: 300 },
    );

    this.#activePage = pageIndex;
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
