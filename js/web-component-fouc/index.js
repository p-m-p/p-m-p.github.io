class ShareButton extends HTMLElement {
  connectedCallback() {
    const data = {
      url: document
        .querySelector("meta[property='og:url']")
        .getAttribute("content"),
      title: "Phil Parsons",
      text: document
        .querySelector("meta[property='og:title']")
        .getAttribute("content"),
    };

    if (navigator.canShare(data)) {
      this.innerHTML = '<button type="button">Share this</button>';

      this.querySelector("button").addEventListener("click", async () => {
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
