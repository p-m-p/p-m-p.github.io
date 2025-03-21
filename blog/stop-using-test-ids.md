---
title: Stop using test ids and embrace user experience testing
description:
  The pattern of using data-testid attributes to locate elements in UI tests has
  been around a while. Over that time the tools we use in testing have developed
  and while test ids still have a place in our toolkit, there is a better
  approach.
date: 2025-03-18
draft: true
---

## Where do test ids come from?

Legacy testing tools like Selenium WebDriver follow the browser API more closely
with limited methods for selecting elements and asserting state. This limitation
led to the rise of the test id pattern used by developers to apply test ids for
the sole purpose of selecting elements in tests. The argument for using these
test ids came from the logic of decoupling the tests from the application state
and this makes sense. Using selectors based on class names or, shudders, XPath
expressions result in brittle tests that often fail after refactoring code or
developing new features.

Modern testing tools like [Playwright][playwright] and [Testing
Library][testing-library] provide an API based on usability with a language that
closely resembles how a user interacts with an application. With these tools we
can avoid the test id pattern, embrace user experience and iterate quickly with
a test driven approach to feature development.

The code examples in this article show the use of Playwright and Testing Library
has a similar API for writing tests.

## False positives from using test ids

Test IDs have little to no relation to the elements they appear on and this can
mislead us into accepting changes that have passing tests but break the
underlying implementation or negatively impact user experience.

Take this test for a button that opens a terms and conditions dialog.

```js
test("opens terms and conditions", async ({ page }) => {
  await page.getByTestId("view-terms-button").click();
  await expect(page.getByTestId("view-terms-dialog")).toBeVisible();
});
```

The names of the test ids allude to the role of the elements but do not enforce
this and allow someone to change the structure of the HTML without causing the
tests to fail.

For example, the button gets implemented as a div and keyboard users can't
access it but the tests still pass. This one I've seen more times than I can
remember!

```jsx
<div
  data-testid="view-terms-button"
  class="btn btn-outlined"
  onClick={handleShowDialog}>
  View terms and conditions
</div>
```

## HTML clutter and inconsistent naming

Test IDS introduce clutter in the HTML that serves no purpose in the live
application or website, unless you YOLO it and test in production. Strategies to
[remove them during builds][remove-test-ids] exist and this seems like a bad
idea but if you don't, someone will probably write some production code at some
point that naively targets a test id.

Naming test ids also becomes a problem at scale. You need a system for naming to
keep them unique that inevitably becomes related to some robot generated string
that includes a Jira story number and results in the intent of selectors in
tests becoming even less clear. You may even want to keep an inventory of test
ids to track usage, maybe you will need automated checks for this during the
build too. I say these things somewhat jokingly but I have seen it all, even
dedicated QA teams making code changes to apply test ids after features had
launched in production.

## Clear intentions lead to more maintainable tests

Okay, so how do semantic queries solve these problems? Let's look at the Swiss
Army Knife of the element locators, `getByRole`.

This selector queries for elements by their semantic role (like button, link,
menu etc). Selecting elements this way mirrors how real users and assistive
technologies interact with the page and helps us to ensure that the page
functions correctly for all users.

On top of that, if we follow a test driven approach to development using
semantic roles to select elements, this helps us to think about the user
experience design and how we can better structure our HTML. This also leads to a
more maintainable codebase and makes the tests easier to read.

Let's change the terms and conditions test to use `getByRole` locators.

```js
test("opens terms and conditions", async ({ page }) => {
  await page.getByRole("button", { name: "View terms and conditions" }).click();
  await expect(
    page.getByRole("dialog", { name: "Terms and conditions" }),
  ).toBeVisible();
});
```

The div implementation of the button will now fail because it does not have the
accessible button role. We could of course add the role attribute to make the
tests pass but, of course, we'll instead update it to use a button element.

Role based queries makes us think more closely about accessibility and enable us
to test for fundamental features like accessible names and state in our HTML.
Having this in the tests arguably make them easier to read and more maintainable
too.

### How far does `getByRole` take us?

While not every element will have a clear role to select, we can cover probably
99% of cases using the [available roles][roles] combined with query options.

The options refine a query based on the state of the element with attributes
like name, pressed, checked or selected. This also helps to show clear intent in
the test while ensuring the feature meets accessibility requirements.

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

We can write queries that distinguish elements with the same role and name by
chaining locators. Select the closest landmark to the element first (like
navigation regions, headers, sidebars) and from there query for the element.

```js
test("navigates to home page from main navigation", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home page" })
    .click();
  await expect(page).toHaveURL("/");
});
```

[playwright]: https://playwright.dev/
[testing-library]: https://testing-library.com/
[roles]:
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles
[remove-test-ids]:
  https://nextjs.org/docs/architecture/nextjs-compiler#remove-react-properties
