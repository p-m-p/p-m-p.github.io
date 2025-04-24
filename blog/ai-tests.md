---
title: Does TDD have relevance in a AI assisted developer workflow?
description:
  AI assisted development, like Test-Driven Development (TDD), requires
  developers to think carefully about requirements before writing code. Instead
  of writing test cases first, developers craft prompts to generate both
  implementation and tests simultaneously. This shift in approach maintains the
  benefits of upfront design while potentially accelerating the development
  process.
date: 2025-04-23
draft: true
---

## A proven benefit of Test-Driven Development

The Test-Driven Development (TDD) approach flips traditional software
development and instead of writing code first, we write tests that define the
expected behavior before the code needed to pass those tests. In the Red → Green
→ Refactor approach to TDD we write a failing test (Red), implements the
quickest solution to pass the test (Green), and then refactors to improve
structure and readability (Refactor).

By writing tests first, we have the opportunity to think more deeply about the
design and structure of our code and this leads to cleaner and more maintainable
code.

## AI assisted development, for the vibes

When generating code with AI the development process turns around in a similar
way to TDD. Rather than dive straight into code we have to stop and think about
how to define the problem so that we can write a prompt that will yield the
correct result.

This then begs the question, should we still write the tests first or should we
generate them later once we have refined our prompt and the generated code?
Let's take a look at an example.

### Creating a lazy initialisation utility

To keep this simple we'll create a utility function in TypeScript that will
lazily initialize a module. This function takes a module initialisation function
and only calls it on first use with repeat calls returning the already
initialised module.

In a TDD workflow we start by writing tests for the core functionality.

```ts
import { lazyInit } from "./lazyInit";

describe("lazyInit", () => {
  it("initialises module on first use", async () => {
    const mod = { foo: "bar" };
    const init = vi.fn().mockResolvedValue(mod);
    const lazy = lazyInit(init);

    expect(init).not.toHaveBeenCalled();
    expect(await lazy()).toBe(mod);
    expect(init).toHaveBeenCalled();
  });

  it("returns initialised module on subsequent uses", async () => {
    const init = vi.fn(() => ({
      greet() {
        return "Hello, World!";
      },
    }));
    const lazy = lazyInit(init);

    const firstCall = await lazy();
    const secondCall = await lazy();

    expect(firstCall).toBe(secondCall);
    expect(init).toHaveBeenCalledTimes(1);
  });
});
```

The tests fail, we write the code to pass the tests and then we refactor to tidy
things up. Writing the tests first helped to think through the design of the
solution, give full coverage and will catch any regressions in future changes.

If, rather than hand code the implementation, we generate the code with AI we
will go through a process of design to create a prompt, refine it and then
refactor the result. Like the Red → Green → Refactor approach of TDD but rather
than outlining functionality in tests we have to define it in the prompt and ask
for the test coverage at the same time.

Using Claude 3.5 Sonnet we can generate the code with a prompt like below.

```text
Create a lazy initialisation function called lazyInit with the following specification:

1. Takes a single argument of a function that returns a value
2. Returns a new function that, when called, returns the value from calling the provided function
3. The provided function should only be called once, on the first call
4. Has a test suite using Vitest
```

It may take a few iterations at this stage to get the prompt right but once we
have it we find ourselves at the refactor stage, same as with TDD but quicker.

What did Claude generate for us? The function looks pretty good, it uses a
separate variable to store the value and a Boolean to track the initialisation
state where I would probably check for the definition of value knowing that the
function should always return something. Also, factory seems like a poor name
for the init function.

```typescript
export function lazyInit<T>(factory: () => T): () => T {
  let value: T;
  let initialized = false;

  return () => {
    if (!initialized) {
      value = factory();
      initialized = true;
    }
    return value;
  };
}
```

It generated valid tests, not too different to what I wrote by hand! The factory
name appears here too and I'd prefer imperative test descriptions but we can
refine the prompt or refactor the code to rename it easy enough.

```typescript
import { describe, it, expect, vi } from "vitest";
import { lazyInit } from "./lazyInit";

describe("lazyInit", () => {
  it("should call factory only on first invocation", () => {
    const mockFactory = vi.fn(() => 42);
    const getValue = lazyInit(mockFactory);

    expect(mockFactory).not.toHaveBeenCalled();

    const result1 = getValue();
    expect(mockFactory).toHaveBeenCalledTimes(1);
    expect(result1).toBe(42);

    const result2 = getValue();
    expect(mockFactory).toHaveBeenCalledTimes(1);
    expect(result2).toBe(42);
  });

  it("should return same instance on subsequent calls", () => {
    const getValue = lazyInit(() => ({ value: Math.random() }));

    const result1 = getValue();
    const result2 = getValue();

    expect(result1).toBe(result2);
  });
});
```
