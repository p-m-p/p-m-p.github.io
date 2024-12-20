class ShareButton extends HTMLElement {
  connectedCallback() {
    const slot = document.createElement("slot");
    slot.setAttribute("name", "share-btn");

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(slot);

    let { url, text, title } = this.dataset;

    if (!url) {
      url =
        document
          .querySelector("meta[property='og:url']")
          ?.getAttribute("content") ?? location.href;
    }

    if (!text) {
      text = document
        .querySelector("meta[property='og:description']")
        ?.getAttribute("content");
    }

    if (!title) {
      title =
        document
          .querySelector("meta[property='og:title']")
          ?.getAttribute("content") ?? document.title;
    }

    const data = { url, text, title };

    if (navigator.canShare(data)) {
      slot.addEventListener("click", async (ev) => {
        ev.preventDefault();

        try {
          await navigator.share(data);
        } catch (e) { }
      });
    }
  }
}

if ("share" in navigator) {
  customElements.define("share-button", ShareButton);
}
