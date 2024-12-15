class ShareButton extends HTMLElement {
  connectedCallback() {
    let { url, text, title } = this.dataset;

    if (!url) {
      url =
        document
          .querySelector("meta[property='og:url']")
          ?.getAttribute("content") ?? location.href;
      text = document
        .querySelector("meta[property='og:description']")
        ?.getAttribute("content");
      title =
        document
          .querySelector("meta[property='og:title']")
          ?.getAttribute("content") ?? document.title;
    }

    const data = { url, text, title };

    if (navigator.canShare(data)) {
      const shadow = this.attachShadow({ mode: "open" });
      shadow.innerHTML = `<slot name="share-btn"><button type="button">Share that</button></slot>`;

      shadow.querySelector("slot").addEventListener("click", async () => {
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
