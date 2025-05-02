---
title: Does TDD have relevance in an AI assisted developer workflow?
description:
  Can the structured approach of Test-Driven Development (TDD) be applied to AI
  code generation? Let's look at the concept of Prompt-Driven Development (PDD),
  where we guide AI by applying the design principles of TDD to prompt
  specifications.
date: 2025-04-23
draft: true
---

## A shared benefit of TDD and AI assisted development

With a traditional software development process like Test-Driven Development
(TDD), instead of writing code first, we write tests that define the expected
behavior. In the [Red → Green → Refactor][red-green-refactor] approach we:

1. **Red**: write tests that fail
2. **Green**: implements the quickest solution to make the test pass
3. **Refactor**: improve aspects like structure, code reuse and readability

Writing tests first presents an opportunity to think more strategically about
system design, creates living documentation of requirements and provides a
safety net when making future changes.

When we generate code with AI we front-load the development process with design
in a similar way to TDD. Rather than dive straight into code we have to define
the problem with enough context and implementation detail in a prompt. We still
want tests for the same reasons as TDD but where in the workflow should we add
them?

## The TDD vs AI assisted development workflow

Let's compare the process of adding a new function, using both techniques, with
the following high level specification.

> Create a lazy initialisation function for modules that will only initialise
> the module on first call and return the initialised module on repeat calls.
> The function should return a new function that returns the initialised module
> when called.

### Manually writing the code with TDD

With TDD we analyze the specification before creating a minimal code structure
and outlining tests that define and assert the core functionality, the Red
stage.

```ts
import { lazyInit } from "./lazyInit";

describe("lazyInit", () => {
  it("initialises module on first call", () => {
    const mod = {};
    const init = vi.fn().mockReturnValue(mod);
    const lazyMod = lazyInit(init);

    expect(init).not.toHaveBeenCalled();
    expect(lazyMod()).toBe(mod);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("returns initialised module on repeat calls", () => {
    const init = vi.fn().mockReturnValue({
      greet() {
        return "hello";
      },
    });
    const lazyMod = lazyInit(init);
    const first = lazyMod();
    const second = lazyMod();

    expect(first).toBe(second);
    expect(init).toHaveBeenCalledTimes(1);
  });
});
```

At this stage the tests fail so we write just enough code to make them pass and
move from Red to Green.

```ts
export function lazyInit(fn: () => any) {
  let mod;

  return () => {
    if (mod === undefined) {
      mod = fn();
    }

    return mod;
  };
}
```

From the green stage we can refactor the code to improve things like structure,
code reuse and readability.

### Generating the code with AI

To generate the function and tests with AI we'll follow a similar process but
focus first on the prompt. Using [Claude][claude] over chat we'll provide it
with the high level specification, outline the implementation details and ask
for the tests.

```text
Create a lazy initialisation function for modules that will only initialise
the module on first call and return the initialised module on repeat calls.
The function should return a new function that returns the initialised module
when called.

Here's the function specification:
- The code is written in TypeScript
- The function is called lazyInit and takes a single function argument
- The argument is called fn and returns the initialised module when called

Add a test suite with Vitest that tests:
- The module is initialised on first call
- The initialised module is returned on repeat calls
```

Claude does a decent job with this prompt and generates code that covers the
specification.

```typescript
export function lazyInit<T>(fn: () => T): () => T {
  let instance: T | undefined;

  return () => {
    if (!instance) {
      instance = fn();
    }
    return instance;
  };
}
```

It generates valid tests, not too different to what I wrote by hand. They could
do with a bit of refinement to assert the function returns the same module and
not a structurally equal one but we'll accept them.

```typescript
import { describe, test, expect, vi } from "vitest";
import { lazyInit } from "./lazyInit";

describe("lazyInit", () => {
  test("initialize module on first call", () => {
    const mockInit = vi.fn(() => ({ data: "test" }));
    const getModule = lazyInit(mockInit);

    const result = getModule();

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: "test" });
  });

  test("return cached module on subsequent calls", () => {
    const mockInit = vi.fn(() => ({ data: "test" }));
    const getModule = lazyInit(mockInit);

    getModule(); // First call
    const secondResult = getModule(); // Second call
    const thirdResult = getModule(); // Third call

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(secondResult).toEqual({ data: "test" });
    expect(thirdResult).toEqual({ data: "test" });
  });
});
```

As with TDD we have reached the green stage with tests that pass and can now
refactor the code either manually or over chat with Claude.

With AI code generation we document our thought process and design in the
prompt, let's call this Prompt-Driven Development (PDD)\*. Due to the speed of
development with AI the need to write tests first becomes less relevant but the
iterative process of making changes in small, well defined increments remains as
important as ever.

A summary of the shared qualities of TDD and PDD:

- **Upfront design**: Upfront design involves planning the architecture and
  structure of your code before implementation. This helps to identify
  challenges early and ensures that the codebase remains scalable and
  maintainable.
- **Safety net of tests**: Having tests ensures that the code behaves as
  expected and acts as a safety net, catching bugs and regressions as you make
  changes to the codebase.
- **A living documentation of requirements**: Tests serve as living
  documentation by defining the expected behavior of the code and a reference
  for understanding feature requirements.
- **Break change down into small, well-defined iterations**: Breaking changes
  into smaller, manageable iterations makes the development process more
  predictable and reduces the risk of introducing errors. It also allows for
  incremental progress and easier debugging.
- **Refactor to improve structure, code reuse, and readability**: Refactoring
  involves improving the internal structure of your code without changing its
  external behavior. This enhances code readability, promotes reuse, and makes
  the codebase easier to maintain.

\*I'd like to take credit for the term but this [article on PDD](pdd] by Andrew
Miller discusses it with a different focus but great insight.

[red-green-refactor]: https://www.jamesshore.com/v2/blog/2005/red-green-refactor
[claude]: https://www.anthropic.com/claude
[pdd]: https://andrewships.substack.com/p/prompt-driven-development
