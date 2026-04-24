---
title: "Frontend Has a Talent Problem"
description: "After interviewing hundreds of frontend engineers, a pattern has emerged: strong experience with frameworks, but weak understanding of the web platform itself. This isn't a React problem—it's a signalling problem in how we hire, evaluate, and develop engineers."
date: 2026-04-24
draft: true
---

Over the last few years, I've interviewed hundreds of frontend engineers across all levels. On paper, many look strong: good companies, modern stacks, years of experience.

But there's a consistent pattern.

A surprising number of candidates — including senior engineers — struggle with the fundamentals of the web platform. Not edge cases or spec trivia, but the core things you rely on every day when building for the browser. How the browser renders and updates the UI, how asynchronous behaviour actually works, what happens to requests once they leave the client, and where performance issues really come from.

At the same time, those same engineers are often very comfortable within React.

That contrast is where the problem starts.

## This Isn't About React — It's About Where Understanding Stops

It's easy to blame React, but that misses the point. It's a useful abstraction that's helped teams move faster and standardise how we build complex interfaces.

The issue is that, for many engineers, it has become the boundary of understanding.

"I'm a React developer" is now a common identity, and companies reinforce it by hiring for exactly that. But React isn't a domain. It's a tool. A frontend engineer builds on the web platform; React is just one way of interacting with it.

That distinction matters more than it sounds. If your mental model of the system starts and ends at the framework, you're dependent on it in ways that only become obvious when something breaks.

## We're Measuring the Wrong Things

Alex Russell describes this dynamic well in *The Market for Lemons*: when the signals used to evaluate quality are weak, the market struggles to distinguish between genuine depth and surface-level competence.

That maps closely to what's happening in frontend hiring.

We hire for frameworks. We interview for familiarity with patterns. We reward the ability to ship quickly within a known set of tools. None of those are inherently bad, but they're incomplete signals.

The result is a market where it's entirely possible to look experienced without having a strong grasp of the underlying platform.

## Abstraction Without Accountability

Frameworks are designed to hide complexity. That's their job. But hiding complexity doesn't remove it—it just moves it somewhere else.

It's now entirely possible to build, ship, and even scale frontend systems without ever developing a strong understanding of what's happening underneath. You can stay within the guardrails of the framework and remain productive for quite a long time.

AI has accelerated this dynamic. It's easier than ever to generate working solutions quickly, often without needing to reason too deeply about them.

The trade-off is that the feedback loop has changed. The moments that used to force engineers to understand the system have been smoothed over. The gaps don't disappear—they just show up later, usually in production, when the abstraction stops helping.

## This Is a System Problem, Not an Individual One

It's easy to frame this as engineers not being good enough. That's not particularly useful.

The industry has created the conditions for this outcome. We hire for "React developers". We interview for framework knowledge and abstract problem solving that doesn't reflect the job. We prioritise delivery speed over depth because that's what organisations reward.

Given those incentives, the results we're seeing are predictable.

## Why This Matters in Practice

This isn't about engineering purity or wanting everyone to go back to vanilla JavaScript.

It shows up in much more practical ways. Performance issues become long investigations instead of quick fixes. Systems become harder to reason about, so teams compensate by adding more abstraction rather than less. Accessibility gaps slip through because they're not well understood. When something breaks, engineers fall back to trial and error instead of working from a clear model of the system.

In enterprise systems, particularly in finance, those inefficiencies translate directly into cost, risk, and slower delivery over time.

## What Good Looks Like

This isn't about expecting everyone to be a browser internals expert.

But a strong senior frontend engineer should be able to step outside the framework when needed. They should have a working understanding of how the browser behaves, how data flows through the system, and where the real costs are. Most importantly, they should be able to reason about problems from first principles when the abstraction stops helping.

The key is optionality—the ability to operate with or without the framework.

## What We Should Do About It

If we want better outcomes, we need to change the signals.

That starts with hiring. Stop hiring for frameworks as if they're a specialisation. Hire frontend engineers who can use tools like React, not engineers defined by them.

It continues with how we evaluate people. Real-world exercises—reviewing code, debugging behaviour, explaining trade-offs—tell you far more than trivia or algorithm questions, and they're far more resistant to AI-assisted answers.

It also requires creating space for depth. If every sprint is purely delivery-focused, engineers won't develop a deeper understanding by accident. It has to be intentional.

Finally, we need to be deliberate about how AI is used. It's a powerful multiplier, but it should accelerate understanding, not replace it.

## A Simpler Framing

Frontend engineering isn't React.

It's the web platform.

React is just one layer on top. And if we want stronger engineers—and more resilient systems—we need to start hiring and developing people accordingly.

---

## References

- Alex Russell — *The Market for Lemons*  
  https://infrequently.org/2020/09/the-market-for-lemons/
