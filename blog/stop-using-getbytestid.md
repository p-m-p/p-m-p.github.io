---
title: Stop using getByTestId and embrace semantic element queries
description:
  The pattern of using data-testid attributes to locate elements in UI tests has
  been around a while. Over that time the tools we use in testing have developed
  and while test ids still have a place in our toolkit, there is a better
  approach.
date: 2025-03-18
draft: true
---

## Modern test tooling

Two popular testing frameworks, Playwright and Testing Library, have a similar
API for locating and asserting the state of elements in the document. This
article will use Playwright for code examples but in most cases will have the
same or similar API in Testing Library.

## Accessibility and User Focus

The first query selector we should reach for, `getByRole`, selects elements by
their semantic role (like button, link, menu etc). Selecting elements this way
mirrors how real users and assistive technologies interact with the page,
validating that the page functions correctly for all users. Following a test
driven approach to development, using semantic roles to select elements also
helps us to think about how we can better structured our HTML and likely lead to
a more maintainable codebase over time.

### The risks that come with using getByTestId

Test IDs have little to no relation to the elements they appear on and this can
mislead us to accept changes that have passing tests but break the underlying
implementation.

Take this test for a terms and conditions dialog as an example.

```js
test("accepts terms and conditions", async ({ page }) => {
  await page.getByTestId("view-terms-button").click();
  await expect(page.getByTestId("view-terms-dialog")).toBeVisible();
});
```

Only the names of the test ids allude to the structure of the elements so if
someone changes the structure of the HTML the tests may still pass but the
feature may become unusable for some or all users.

A good example, and something I see more often than you'd think, the button gets
updated to a div and keyboard users can no longer access it but the tests still
pass.

```html
<div data-testid="view-terms-button" class="view-terms-button">
  View terms and conditions
</div>
```
