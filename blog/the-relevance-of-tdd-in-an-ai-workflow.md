---
title: Does TDD have relevance in an AI assisted developer workflow?
description:
  Can the principles of Test-Driven Development (TDD) be applied to AI code
  generation? Let's look at the concept of Prompt-Driven Development (PDD),
  where we guide AI by applying the principles of TDD in prompt specifications.
date: 2025-04-23
draft: true
---

## A shared benefit of TDD and AI assisted development

With a traditional software development process like Test-Driven Development
(TDD), instead of writing code first, we write tests that define the expected
behavior. A common approach for TDD named [Red → Green →
Refactor][red-green-refactor] breaks the development process into an iterative
cycle of three distinct phases:

1. **Red**: think through the problem and create tests that cover the desired
   output
2. **Green**: implements the quickest solution to make these test pass
3. **Refactor**: update to improve aspects like structure, code reuse and
   readability

People often associate TDD with just writing the tests first but the real value
comes from breaking down and delivering requirements in small increments. When
generating code with AI we front-load the development process with design in a
similar way. Rather than dive straight into code we define the problem with
enough context and implementation detail in a prompt.

With this in mind, we'll want AI to generate tests for each iteration but in a
more Prompt-Driven Development workflow (PDD).

## The TDD vs AI assisted development workflow

Let's compare the process of adding a new function, using both TDD and PDD, from
the following technical specification.

> Create a lazy initialisation function for modules that will only initialise
> the module on first call and return the initialised module on repeat calls.
> The function should return a new function that returns the initialised module
> when called.

### Manually writing code and tests following TDD

With TDD we analyze the specification before creating the minimal code structure
so that we can outline tests that define and assert the core functionality we
intend to add in this iteration, the Red stage.

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
code reuse and readability. The example uses TypeScript so we'd define some
proper generic types for the module initialisation parameter and returned
function here.

### Generating the code and tests with AI

To generate the function and tests with AI we follow a similar process but focus
first on the prompt rather than add any code or tests. Using an AI chat
interface, [Claude][claude] here, we provide the high level specification and
outline the implementation details including the tests.

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

AI does a decent job with this prompt and generates code that covers the
specification, not too different from what I wrote by hand.

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

The tests run and pass so we can't really relate to the Red aspect of the
initial phase but we did benefit in the same way when writing the prompt. The
generated test code could do with a bit of refinement but could have provided
some context here to match existing standards.

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

### Refactoring the code in either workflow

In both of the code examples we reached the green stage with tests that pass so
can now start the refactoring process. We can mix and match manual edits, code
completion or full generation of code with AI here to our hearts content but we
shouldn't need to touch the tests in either workflow unless for anything other
than correction.

## Conclusion

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
