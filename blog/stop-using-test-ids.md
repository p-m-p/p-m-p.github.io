---
title: Stop using a test ID and assert usability instead
description:
  The pattern of applying a test ID to an element to more easily selected it in
  tests has existed for a while. During that time the tools we use as developers
  and testers have improved greatly and offer a more user centric approach to
  asserting our applications behave as expected.
date: 2025-03-18
---

## Where did the test ID come from?

Mature testing tools like Selenium WebDriver supply a somewhat limited set of
methods for selecting elements and asserting state. This limitation led to the
rise of the test ID pattern used by developers to apply an attribute to elements
for the sole purpose of selecting them in tests. If I recall correctly, the
birth of this pattern came from the logic of decoupling tests from the
application state and sure, this makes a lot of sense. Using the selectors based
on class name or, shudders, XPath expressions result in brittle tests that often
fail after refactoring code or developing new features. The problem then? This
separation comes at a cost, the industry recognised this and the tooling adapted
accordingly.

Modern testing tools like [Playwright][playwright] and [Testing
Library][testing-library] provide an API based much more closely on usability
with language that does a great job of describing how a user interacts with an
application. Using these tools we can avoid the test id pattern, embrace user
experience in our tests and iterate quickly with a test driven approach to
feature development.

The code examples in this article show use of Playwright but translate to
Testing Library which has a similar API for writing tests.

## False positives from test ids

A test ID has little to no relation to the element it appears on and this can
mislead us into accepting changes that have passing tests but break the
underlying implementation or negatively impact user experience.

Take this test for a button that opens a terms and conditions dialog.

```js
test("opens terms and conditions", async ({ page }) => {
  await page.getByTestId("view-terms-button").click();
  await expect(page.getByTestId("view-terms-dialog")).toBeVisible();
});
```

While the test ID names do allude to the role of the elements the test does not
check or enforce it. This allows for a poor implementation in the HTML that
doesn't cause the tests to fail.

If the button gets implemented as a div, keyboard users can't access it but the
tests still pass. This particular one I've seen more times than I can remember!

```jsx
<div
  data-testid="view-terms-button"
  class="btn btn-outlined"
  onClick={handleShowDialog}>
  View terms and conditions
</div>
```

## Test ID maintenance costs

Test IDs introduce clutter in the HTML markup that serves no purpose in the live
application, unless you YOLO it and test in production. Strategies to [remove
test ids during builds][remove-test-ids] exist and while this seems like a bad
idea, if you don't do it someone will probably write some production code at
some point using a test ID in a weird and wonderful way.

Test ID naming can also becomes a problem at scale. It requires a naming system
to ensure uniqueness while logically grouping related IDs within a feature. This
will likely lead to a lack of clear intent in the tests that become gradually
harder to maintain.

## Clear intention results in maintainable tests

Okay, so how do modern testing tools solve these problems? Let's look first at
the Swiss Army Knife of the element locators, `getByRole`.

This selector queries for elements by their semantic role (like button, link,
menu etc). Selecting elements this way mirrors how real users and assistive
technologies interact with the page and helps ensure that our features function
correctly for all users.

On top of that, if we follow a test driven approach to development using roles
to select elements helps us to think about user experience design and how we
should better structure our HTML.

Let's change the terms and conditions test from before to use `getByRole`
locators.

```js
test("opens terms and conditions", async ({ page }) => {
  await page.getByRole("button", { name: "View terms and conditions" }).click();
  await expect(
    page.getByRole("dialog", { name: "Terms and conditions" }),
  ).toBeVisible();
});
```

This test will fail with the div implementation of the button as it does not
have the accessible button role. We could naively add a role attribute to make
the tests pass but we'd instead update it to use a button element.

Role based queries like this make implementing accessibility more deliberate and
enable us to test for it early in our feature development. Having this in the
tests also makes them more descriptive and maintainable.

### How far does `getByRole` take us?

While not every element will have a clear role to select, we can cover probably
99.9% of cases using the [available roles][roles] combined with query options.

Options refine a query based on the state of the element with attributes like
name, pressed, checked and selected that have the added benefit of providing
even more clear intent.

An example here with a test that expands an accordion item within an FAQ
section.

```js
test("expands FAQ section", async ({ page }) => {
  await page.getByRole("button", { name: "Shipping costs" }).click();
  await expect(
    page.getByRole("region", {
      name: "Shipping costs",
      expanded: true,
    }),
  ).toBeVisible();
});
```

We can write queries that distinguish elements with the same role and name by
chaining locators to select within a region. To do this we might select a
landmark close to the element first (like navigation regions, headers, sidebars)
and query for the element within it.

This test follows the home page link in the main navigation in a page with a
link that has the same name around a logo.

```js
test("navigates to home page from main navigation", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home page" })
    .click();
  await expect(page).toHaveURL("/");
});
```

Broad selectors like this won't break if the structure of the navigation
changes. They also assure us that we have properly structured HTML and paint a
clearer picture of the feature under test.

Consider the same test with an ID, we have to rely solely on the test
description and have no assurance that the navigation functions correctly.

```js
test("navigates to home page from main navigation", async ({ page }) => {
  await page.getByTestId("nav-home-link").click();
  await expect(page).toHaveURL("/");
});
```

## Should we ever use test a test ID?

Selector performance often comes up in a debate over the use of the test ID
strategy and while the argument has merit, we need to consider the benefits
gained from using semantic queries. `getByRole` is slower than `getByTestId` due
to the algorithm used to select the element and perform checks to assert its
accessibility.

Narrowing focus of selectors using locator chaining as shown above and ensuring
we address performance within the application itself will help. We _can_ also
introduce a test ID at this point to further improve selector performance but
this should not impact the semantics of the tests.

As an example, here we narrow the focus of the terms and conditions test by
chaining locators with a test ID.

```js
test("opens terms and conditions", async ({ page }) => {
  await page
    .getByTestId("terms-and-conditions")
    .getByRole("button", { name: "View terms and conditions" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Terms and conditions" }),
  ).toBeVisible();
});
```

[playwright]: https://playwright.dev/
[testing-library]: https://testing-library.com/
[roles]:
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles
[remove-test-ids]:
  https://nextjs.org/docs/architecture/nextjs-compiler#remove-react-properties
