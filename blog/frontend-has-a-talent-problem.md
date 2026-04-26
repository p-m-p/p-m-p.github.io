---
title: Frontend has a skills problem
description:
  Over the last few years, I've worked with and interviewed many frontend
  engineers across all levels. Few of these people have a broad understanding of
  the web platform and there is a rapidly growing over-reliance on frameworks.
date: 2026-04-24
draft: true
social_card: frontend-has-a-talent-problem.jpg
---

## This isn't another React rant

It's easy to blame React, and even though there's fingers to point in that
direction, the argument often misses the point. I believe that React has done
some good things for industry and, for me, the developer experience of JSX still
feels most comfortable in complex app development.

The issue I see is that **frameworks are the boundary of understanding** and the
_React developer_ is _the_ common identity that companies reinforce in hiring.
People joining the industry naturally align to this identity and then fail to
learn the building blocks of the web platform.

## Abstraction without accountability

Framework abstractions hide complexity, of course. It's entirely possible to
build an app without ever developing a strong understanding of what's happening
in the browser. AI is accelerating this dynamic and, maybe this is okay in some
contexts, but not where it really matters.

---

## We're Measuring the Wrong Things

Alex Russell describes this dynamic well in _The Market for Lemons_: when the
signals used to evaluate quality are weak, the market struggles to distinguish
between genuine depth and surface-level competence.

That maps closely to what's happening in frontend hiring.

We hire for frameworks. We interview for familiarity with patterns. We reward
the ability to ship quickly within a known set of tools. None of those are
inherently bad, but they're incomplete signals.

The result is a market where it's entirely possible to look experienced without
having a strong grasp of the underlying platform.

## This Is a System Problem, Not an Individual One

It's easy to frame this as engineers not being good enough. That's not
particularly useful.

The industry has created the conditions for this outcome. We hire for "React
developers". We interview for framework knowledge and abstract problem solving
that doesn't reflect the job. We prioritise delivery speed over depth because
that's what organisations reward.

Given those incentives, the results we're seeing are predictable.

## Why This Matters in Practice

This isn't about engineering purity or wanting everyone to go back to vanilla
JavaScript.

It shows up in much more practical ways. Performance issues become long
investigations instead of quick fixes. Systems become harder to reason about, so
teams compensate by adding more abstraction rather than less. Accessibility gaps
slip through because they're not well understood. When something breaks,
engineers fall back to trial and error instead of working from a clear model of
the system.

In enterprise systems, particularly in finance, those inefficiencies translate
directly into cost, risk, and slower delivery over time.

## What Good Looks Like

This isn't about expecting everyone to be a browser internals expert.

But a strong senior frontend engineer should be able to step outside the
framework when needed. They should have a working understanding of how the
browser behaves, how data flows through the system, and where the real costs
are. Most importantly, they should be able to reason about problems from first
principles when the abstraction stops helping.

The key is optionality—the ability to operate with or without the framework.

## What We Should Do About It

If we want better outcomes, we need to change the signals.

That starts with hiring. Stop hiring for frameworks as if they're a
specialisation. Hire frontend engineers who can use tools like React, not
engineers defined by them.

It continues with how we evaluate people. Real-world exercises—reviewing code,
debugging behaviour, explaining trade-offs—tell you far more than trivia or
algorithm questions, and they're far more resistant to AI-assisted answers.

It also requires creating space for depth. If every sprint is purely
delivery-focused, engineers won't develop a deeper understanding by accident. It
has to be intentional.

Finally, we need to be deliberate about how AI is used. It's a powerful
multiplier, but it should accelerate understanding, not replace it.

## References

- Alex Russell — _The Market for Lemons_
  https://infrequently.org/2020/09/the-market-for-lemons/
