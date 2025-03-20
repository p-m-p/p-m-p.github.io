---
title: Stop using getByTestId and embrace accessible element queries
description:
  The pattern of using data-testid attributes to locate elements in UI tests has
  been around a while. Over that time the tools we use in testing have developed
  and while test ids still have a place in our toolkit, there is a better
  approach.
date: 2025-03-18
draft: true
---

## Where did test ids come from?

Going back 10 or more years the testing tools we had back then followed the
browser API more closely with limited methods for selecting elements and
asserting state. Selenium WebDriver, the most popular tool I remember before the
rise of what you might consider modern, followed this pattern and while I've not
touched it for many years now it appears to have a similar strategy today. This
limitation led to the rise of the test id pattern where developers would apply
test ids for the sole purpose of selecting elements in tests. The logic for
using test ids came from the argument of decoupling the tests from the
application development and this made sense over using selectors based on class
names or, shudders, XPath expressions that would often result in brittle tests
that failed after refactoring code or developing new features.

Two popular testing tools, Playwright and Testing Library, have a similar API
for locating and asserting the state of elements in the document. This article
will use Playwright for code examples but in most cases the same or similar API
exists in Testing Library.

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
test("opens terms and conditions", async ({ page }) => {
  await page.getByTestId("view-terms-button").click();
  await expect(page.getByTestId("view-terms-dialog")).toBeVisible();
});
```

Only the names of the test ids allude to the structure of the elements so if
someone changes the structure of the HTML the tests may still pass but the
feature may become unusable for some or all users.

A good example, and something I see more often than you'd think, the button gets
implemented as a div and keyboard users can't access it but the tests pass
anyway.

```html
<div data-testid="view-terms-button" class="btn btn-outlined">
  View terms and conditions
</div>
```

### Clear intentions lead to more maintainable tests

With role based queries we can assert the accessibility of our HTML at the same
time as testing the feature. The tests become arguably easier to understand and
more maintainable too.

Let's look at the same test using `getByRole` locators.

```js
test("opens terms and conditions", async ({ page }) => {
  await page.getByRole("button", { name: "View terms and conditions" }).click();
  await expect(
    page.getByRole("dialog", { name: "Terms and conditions" }),
  ).toBeVisible();
});
```

Now the div implementation of the button fails because it does not have the
accessible button role. We could of course add the role attribute to make the
tests pass and still have an inaccessible button but with a dose of common sense
we'd update it to a button element.

## How far can `getByRole` _get_ us?

Not every element has a role to select it but we can get pretty far using roles
for navigation, sidebars, headings, links, buttons, menus, lists etc (full list
here).

The selector allows us to refine the query based on accessible attributes like
pressed buttons, checked or disabled form controls, expanded menus or sections.

```js
test("toggles FAQ item", async ({ page }) => {
  await page.getByRole("button", { name: "Shipping costs" }).click();
  await expect(
    page.getByRole("region", {
      name: "Shipping costs",
      expanded: true,
    }),
  ).toBeVisible();
});
```

We can distinguish queries for elements with the same role and name by chaining
locators to select the closest landmark first like the navigation regions,
articles, sidebars and footers.

```js
test("navigates to home page from main navigation", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "home" })
    .click();
  await expect(page).toHaveURL("/");
});
```
