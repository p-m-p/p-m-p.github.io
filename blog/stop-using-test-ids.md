---
title: Stop using Test IDs and assert usability instead
description:
  The pattern of applying a test ID to an element to more easily selected it in
  tests has existed for a while. During that time the tools we use as developers
  and testers have improved greatly and offer a more user centric approach to
  asserting our applications behave as expected.
date: 2025-03-18
---

## Where did the test ID come from?

Mature testing tools like [Selenium WebDriver][webdriver] provide a somewhat
limited set of methods for selecting elements and asserting state. This
limitation led to the rise of the test ID pattern used by developers to apply an
attribute to elements for the sole purpose of selecting them in tests. If I
recall correctly, the birth of this pattern came from the logic of decoupling
tests from the application state and, sure, this makes sense.

Using selectors based on class name or, shudders, XPath expressions results in
brittle tests that often fail when refactoring code or developing new features.
The problem then? This separation comes at a cost that I'll try to cover in this
post, the industry recognised this and the tooling has adapted accordingly.

Modern test tools like [Playwright][playwright] and [Testing
Library][testing-library] provide an API based much more closely on usability
with semantics that help to describe how a user interacts with an application.
Using these tools we can avoid the test ID pattern in favour of selectors that
assert a good user experience with a focus on accessibility.

The code examples in this article show use of Playwright that can easily
translate to Testing Library which has a similar selector and assertion API.

## Addressing the argument against semantic queries

Engineers within dedicated QA teams who take ownership of Test ID maintenance
will likely push back on a more semantic approach. The reason for this normally
stems from a desire to have a separation of concerns, a valid argument when not
testing early in the development lifecycle.

The points I raise against the use of the Test ID in this article still apply in
that scenario but focus more on a full lifecycle of feature development
incorporating all aspects of software quality with assertions for functionality,
accessibility and usability in a single suite of tests.

## False positives from Test ID

A Test ID has little to no relation to the element it appears on and this can
mislead us into accepting changes that have passing tests but break the
underlying implementation or negatively impact user experience.

Take this test for a button that opens a terms and conditions dialog.

```js
test("opens terms and conditions", async ({ page }) => {
  await page.getByTestId("view-terms-button").click();
  await expect(page.getByTestId("view-terms-dialog")).toBeVisible();
});
```

While the Test ID names allude to the role of the elements the test does not
check or enforce them. This allows for a poor implementation of the HTML that
doesn't cause the test to fail.

If someone implements the button as a div, keyboard users can't access it but
the test still passes. This particular one I've seen more times than I care to
remember!

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
the Test ID during builds][remove-test-ids] exist and while this seems like a
bad idea, if you don't do it someone will probably write some code at some point
using a Test ID in a weird and wonderful way.

Test ID naming also becomes a problem at scale. It requires a system to ensure
uniqueness while logically grouping related IDs within a feature. This can lead
to a lack of clear intent in the tests that inevitably become harder to maintain
over time. In my time I've even seen Jira story numbers incorporated into the
Test ID, no joke.

## Clear intention results in maintainable tests

Okay, so how do these modern testing tools solve the problem? Let's focus on the
Swiss Army Knife of the element locators they provide, `getByRole`.

This selector queries for elements by their semantic role (like button, link,
menu etc). Selecting elements this way mirrors how real users and assistive
technologies interact with the application and helps ensure that our features
function correctly for _all_ users.

On top of that, if we follow a test driven approach to development using roles
to select elements helps us to think more deeply about user experience design
and how we should better structure our HTML.

Let's change the terms and conditions test from before to use `getByRole`.

```js
test("opens terms and conditions", async ({ page }) => {
  await page.getByRole("button", { name: "View terms and conditions" }).click();
  await expect(
    page.getByRole("dialog", { name: "Terms and conditions" }),
  ).toBeVisible();
});
```

This test will fail with the div implementation of the button that does not have
the accessible button role. We could naively add a role attribute to make the
tests pass but, of course, we'd instead update the code to use a button element.

Role based queries like this make implementing accessibility more deliberate and
enable us to test for it early in feature development. Having this in the tests
also makes them more readable end ultimately more maintainable.

### How far can we take `getByRole`?

While not every element will have a clear role to select, we can cover probably
99% of cases using the [available roles][roles] combined with query options.

Options refine a query based on the state of the element through attributes like
name, pressed, checked and selected that have the added benefit of providing
even more clear intent.

An example here, a test that expands an accordion item within an FAQ section.

```js
test("expands shipping costs", async ({ page }) => {
  await page.getByRole("button", { name: "Shipping costs" }).click();
  await expect(
    page.getByRole("region", {
      name: "Shipping costs",
      expanded: true,
    }),
  ).toBeVisible();
});
```

We write queries to distinguish elements with the same role and name by chaining
locators to select within a region. To do this we select a landmark close to the
element first (like navigation regions, headers, sidebars) and query for the
element within it.

This example test follows the home page link in the main navigation. Another
link with the same name exists around a logo in the main header.

```js
test("navigates to home page from main navigation", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home page" })
    .click();
  await expect(page).toHaveURL("/");
});
```

Broad selectors like this don't break if the structure of the navigation
changes. They also assure us that we have properly structured HTML and paint a
clearer picture of the feature under test when we return to the code at a later
date.

Consider the same test with a Test ID. We have to rely solely on the test
description and have no assurance that the previous developer implemented the
navigation structure correctly.

```js
test("navigates to home page from main navigation", async ({ page }) => {
  await page.getByTestId("nav-home-link").click();
  await expect(page).toHaveURL("/");
});
```

### A note on accessible labels

The tests examples above use the accessible name option in the locator options.
Labels like this may come from a content management system, possibly even
translated, and like any other application state we need to isolate this content
in our tests. The strategy for this will depend on the tooling used to manage
the content and presents a good opportunity to also assert for content
correctness.

An example here with Playwright, provide an extension to the test fixture and
run the same tests against the different languages.

```js
test("navigates to home page from main navigation", async ({ page, t }) => {
  await page
    .getByRole("navigation", { name: t("navigation.label") })
    .getByRole("link", { name: t("navigation.links.home") })
    .click();
  await expect(page).toHaveURL("/");
});
```

## Should we ever use a Test ID?

Selector performance often comes up in a debate over the use of the Test ID
strategy and while the argument has merit, we need to consider this against the
benefits gained from using semantic queries. Yes, `getByRole` performs more
slowly than `getByTestId` due to the algorithm used to select the element and
for accessibility.

If performance becomes a problem with well structured tests that run in parallel
and narrowing focus of selectors using locator chaining doesn't help, we _can_
introduce a Test ID.

As an example, here we narrow the focus of the terms and conditions test by
chaining locators starting with a test ID.

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

Another, more intrusive pattern, involves applying accessibility tests after
selecting the element with a Test ID. This will help a lot with selector
performance but requires much more discipline in writing tests.

```js
test("opens terms and conditions", async ({ page }) => {
  const button = page.getByTestId("view-terms-button");

  await expect(button).toHaveRole("button");
  await expect(button).toHaveAccessibleName("View terms and conditions");

  await button.click();

  const dialog = page.getByTestId("view-terms-dialog");

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveRole("dialog");
  await expect(button).toHaveAccessibleName("Terms and conditions");
});
```

[webdriver]: https://www.selenium.dev/documentation/webdriver/
[playwright]: https://playwright.dev/
[testing-library]: https://testing-library.com/
[roles]:
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles
[remove-test-ids]:
  https://nextjs.org/docs/architecture/nextjs-compiler#remove-react-properties
[qa-role]: https://newsletter.pragmaticengineer.com/p/qa-across-tech
