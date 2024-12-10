---
title: Web component flash of unstyled content
description:
  A flash of unstyled content (FOUC) is inevitably going to happen in complex
  web components. It's one thing to have your content look bad while the page
  is loading but, more importantly, it could be impacting your core web vital
  CLS score.
tags:
  - posts
  - web
  - web components
  - javascript
  - html
  - css
draft: true
script: /web-component-fouc/index.js
---

## What is FOUC and how does it apply to web components?

A flash of unstyled content (FOUC) occurs when content on a web page is visible before
it has had styling applied to it. This can happen for a miriad of reasons, for example
while background images, web fonts or JavaScript that applies styling load after the
page content is visible.

Web component implementations vary from simple elements that have styles applied from
the root document to complex elements with Shadow DOM and encapsulated styles. In
cases where JavaScript is required to add behaviours to a component or update the
styling a flash of unstyled content can present.

I'll use the share button I recently bullt for my website to demonstrate some of the
issues you may face and look at solutions or implementation ideas to prevent FOUC.

## Building a share this button

The share button attempts to use the [native share functionality][navigator-share] in
the user's browser. At the time of writing this feature is not supported in all browsers
across all devices so a fallback list of links is provided as the initial children of
the component.

```html
<share-button>
  <ul class="share-fallback">
    <li>
      <a href="https://bsky.app/intent/compose?text={{title}}%20{{url}}">Share on Bluesky</a>
    </li>
    <li>
      <a href="https://www.linkedin.com/shareArticle?url={{url}}&amp;title={{title}}">Share on LinkedIn</a>
    </li>
    <li>
      <a href="https://x.com/intent/post?url={{url}}&text={{title}}&via={{author}}">Post on X</a>
    </li>
    <li><copy-to-clipboard text="{{url}}">Copy link</copy-to-clipboard></li>
  </ul>
</share-button>
```

Before applying any styles to this list it presents an opportunity to discuss [Cumulative
Layout Shift][cls] (CLS). While

[navigator-share]: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
[cls]: https://web.dev/articles/cls
