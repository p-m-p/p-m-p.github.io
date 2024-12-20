---
title: Don't FOUC up your web components
description:
  A flash of unstlyed content (FOUC) doesn't just look bad, it could be hurting your
  core web vital score. Let's look at how to use progressive enhancement in web
  components to prevent a FOUC up.
tags:
  - posts
draft: true
---

## What is FOUC and how does it apply to web components?

A [flash of unstyled content][fouc] (FOUC) occurs when content on a web page is visible
before it has had styling applied to it. This can happen for a few reasons, often while
loading images without dimensions, usihg web fonts or with JavaScript that applies
styling to content already loaded and visible in the page. Web components are susceptible
to all of this and introduce even more opportunity to FOUC things up, especially with
the use of Shadow DOM and slots.

I recently bullt the share button for my website, up ihn header, feel free to use it, that
gave me an opporunity to think and deal with both the flash of unstyled content and a
signficant [cumulative layout shift][cls].

Here's how I prevented it.

## The share button web component

The share button is a small web component that attempts to use the [native share
functionality][navigator-share] in the browser. At the time of writing this feature has
good support across browsers but I wanted to also provide a fallback list of links as the
initial content of the component.

```html
<share-button>
  <ul>
    <li>
      <a href="https://bsky.app/intent/compose?text={title}%20{url}">🦋 Share on Bluesky</a>
    </li>
    <li>
      <a href="https://www.linkedin.com/shareArticle?url={url}&title={title}">🏢 Share on LinkedIn</a>
    </li>
    <li>
      <a href="https://x.com/intent/post?url={url}&text={title}&via={author}">💩 Share on X</a>
    </li>
  </ul>
</share-button>
```

Once the component is defined and connected the list of links is replaced with a single
share button.

Even after applying some styles to the list with this approach we can see that the share
button takes up less vertical space than the list of links. When the button replaces the
links the page beneath the header shifts upwards and causes a cumulative layout shift.

<figure>
  <img src="./cls-comparison.png" alt="Diagram that shows how the layout shift between the list of links and share button makes the page content move upwards">
  <figcaption>
    Cumulative layout shift between the fallback links and share button
  </figcaption>
</figure>

### How to fix cumulative layout shift

To avoid the layout shift entirely the list of fallback links needs to occupy the same amount
of vertical space as the share button. I could have tried to display the list items inline
but that wouldn't go any way to removing the flash of unstyled content. To solve both issues
at once I made the fallback work in a similar way to the the share button by using a popover
to display the links and a button as the trigger.

```html
<share-button>
  <button popovertarget="share-fallback">Share</button>

  <div id="share-fallback" popover>
    <h2>Share this page</h2>

    <ul>
      <li>
        <a href="https://bsky.app/intent/compose?text={title}%20{url}">🦋 Share on Bluesky</a>
      </li>
      <li>
        <a href="https://www.linkedin.com/shareArticle?url={url}&title={title}">🏢 Share on LinkedIn</a>
      </li>
      <li>
        <a href="https://x.com/intent/post?url={url}&text={title}&via={author}">💩 Share on X</a>
      </li>
    </ul>
  </div>
</share-button>
```

Now if for some reason the native share functionality isn't supported or the web component isn't yet
connected the popover with the fallback list of links is displayed when the button is clicked. Only
issue now is the button in the web component is duplicated in the fallback content, let's fix it.

### Using a named slot to share the button

I could have shared the CSS to style both buttons but it seemed better yet to share the button
itself. Sharing the button is achieved by adding a Shadow Root to the component with a single
named slot in which to place the button.

```js
class ShareButton extends HTMLElement {
  connectedCallback() {
    const slot = document.createElement('slot')
    slot.setAttribute('name', 'share-btn')

    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.appendChild(slot)

    // Simplified for brevity
    slot.addEventListener('click', (ev) => {
      ev.preventDefault()

      navigator.share({
        title: document.title,
        url: location.href
      })
    })
  }
}
```

Add the slot attribute to the button.

```html
<share-button>
  <button slot="share-btn" popovertarget="share-fallback">Share</button>

  <div id="share-fallback" popover>
    <h2>Share this page</h2>

    <ul>
      <li>
        <a href="https://bsky.app/intent/compose?text={title}%20{url}">🦋 Share on Bluesky</a>
      </li>
      <li>
        <a href="https://www.linkedin.com/shareArticle?url={url}&title={title}">🏢 Share on LinkedIn</a>
      </li>
      <li>
        <a href="https://x.com/intent/post?url={url}&text={title}&via={author}">💩 Share on X</a>
      </li>
    </ul>
  </div>
</share-button>
```

Now when the `share-button` element is upgraded the popover will no longer be displayed
and only the native share functionality will be observed when the button is clicked.

## Handling FOUC without a fallback

The approach used to build the share button is one of [progressive enhancement][progressive-enhancement].
If the component does not have appropriate fallback or initial content then other options
can be used to prevent the flash of unstyled content.

### Hiding elements until they are defined

One method is hiding the element until it has been defined. A quick search, or prompt to your
_trusted_ AI, on this subject will likely lead you to the `:defined` CSS selector.

```css
/* Hide the element until it's defined */
my-element:not(:defined) {
  display: none;
}

/* Show and style the element in it's defined state */
my-element:defined {
  display: block;
}
```

It's a valid approach but the potential for a cumulative layout shift is still present.
You could toggle the `visibility` or `opacity` of the component instead but if the
dimensions change when it becomes defined it will probably still cause a significant
layout shift.

### Declarative Shadow DOM

With [Declarative Shadow DOM][declarative-shadow-dom] we can provide the component with a
template that is attached to the elements shadow root as the component is parsed. Using the
share button example from before the fallback could be provided in the template and the
popover opened with JavaScript if the native share functionality can't be used.

```html
<share-button>
  <template shadowrootmode="open">
    <style>
      /* Fallback styles */
    </style>

    <slot name="share-btn"></slot>

    <div id="share-fallback" popover>
      <h2>Share this page</h2>

      <ul>
        <li>
          <a href="https://bsky.app/intent/compose?text={title}%20{url}">🦋 Share on Bluesky</a>
        </li>
        <li>
          <a href="https://www.linkedin.com/shareArticle?url={url}&title={title}">🏢 Share on LinkedIn</a>
        </li>
        <li>
          <a href="https://x.com/intent/post?url={url}&text={title}&via={author}">💩 Share on X</a>
        </li>
      </ul>
    </div>
  </template>

  <button slot="share-btn">Share</button>
</share-button>
```

[fouc]: https://en.wikipedia.org/wiki/Flash_of_unstyled_content
[navigator-share]: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
[cls]: https://web.dev/articles/cls
[popover]: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover
[progressive-enhancement]: https://www.gov.uk/service-manual/technology/using-progressive-enhancement
[defined]: https://developer.mozilla.org/en-US/docs/Web/CSS/:defined
[declarative-shadow-dom]: https://web.dev/articles/declarative-shadow-dom
