---
title: Does TDD have relevance in an AI assisted developer workflow?
description:
  Can the principles of Test-Driven Development (TDD) be applied to AI code
  generation? Let's look at the concept of Prompt-Driven Development (PDD),
  where we guide AI by applying the principles of TDD.
date: 2025-04-27
social_card: the-relevance-of-tdd-in-an-ai-workflow.jpg
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
more [Prompt-Driven Development][pdd] workflow (PDD).

## A Comparison of TDD and PDD

Let's compare the process of adding a new function, using both TDD and PDD, from
the following technical specification.

> Create a lazy initialisation function for modules that will only initialise
> the module on first call and return the initialised module on repeat calls.
> The function should return a new function that returns the initialised module
> when called.

### Writing tests and code with TDD

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

### Generating tests and code with PDD

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

### Refactoring in both workflows

In both of the code examples we reached the green stage with tests that pass so
can now start the refactoring process. It doesn't matter if we refactor with
manual edits or code generation but we shouldn't need to touch the tests in
either workflow unless for anything other than correction.

## Prompt → Generate → Refactor

With AI code generation we document our thought process and design in the
prompt. Due to the speed of development with AI the need to write tests first
becomes less relevant but the iterative process of making changes in small, well
defined increments remains as relevant as ever. Both TDD and PDD share key
principles:

- **Upfront Design**: Planning the architecture and structure before
  implementation helps identify challenges early and ensures scalability.
- **Safety Net of Tests**: Tests ensure expected behavior and catch bugs or
  regressions during changes.
- **Living Documentation**: Tests serve as a reference for feature requirements
  and expected behavior.
- **Incremental Development**: Breaking changes into small, manageable steps
  reduces errors and simplifies debugging.
- **Refactoring for Improvement**: Enhancing code structure, readability, and
  re-usability ensures maintainability without altering behavior.

Like TDD, we can define the PDD process as a cycle of three stages:

<copy-to-clipboard data-url="/img/blog/the-relevance-of-tdd-in-an-ai-workflow/pdd.png" class="ctc-image">
  <figure>
    <img src="/img/blog/the-relevance-of-tdd-in-an-ai-workflow/pdd.png" alt="Diagram that shows the three stages of the Prompt-Driven Development process">
    <figcaption>
      Prompt, generate, refactor stages of the Prompt-Driven Development process
    </figcaption>
  </figure>
</copy-to-clipboard>

- **Prompt**: think through the problem and create a prompt that covers the
  desired output
- **Generate**: review the generated code, with an emphasis on test correctness,
  from the prompt and apply it to the implementation
- **Refactor**: update to improve aspects like structure, code reuse and
  readability

We can embrace change in the tools with which we create code but the core
principles of how we understand problems and create innovative solutions to
solve them remains the same. To create safe, scalable and maintainable systems
we need to own the process and not fall victim to hype surrounding the
capabilities of our tools.

[red-green-refactor]: https://www.jamesshore.com/v2/blog/2005/red-green-refactor
[claude]: https://www.anthropic.com/claude
[pdd]: https://andrewships.substack.com/p/prompt-driven-development
