# Hexagonal architecture for micro-frontends: blog series design

## Intent

A three-part blog series showing how ports and adapters (hexagonal
architecture) let a micro-frontend panel run unchanged in any host: a
production shell, Storybook, an end-to-end test harness and a web view inside a
legacy desktop application. The series draws on Phil's real design experience
but is written as a general pattern, illustrated with an invented example.

The core idea every post serves: **a panel is defined by what it needs, not
where it runs.** Hosting, backend, tests and legacy embedding all become
swappable adapters.

## Audience

All levels of engineer:

- **Senior engineers and architects** want a design reference they can borrow:
  the port's shape, how adapters divide up, the testing strategy and honest
  trade-offs.
- **Less experienced engineers** need hexagonal architecture explained from
  first principles, through concrete panel code rather than abstract hexagon
  diagrams.
- **Architecture researchers** want evidence that the pattern holds up under
  real-world constraints.

Each post opens with a short summary a senior reader can skim, then builds up
from fundamentals.

## Hard constraint

**No reference to Phil's employer, company, product, team or role**, current
or past, anywhere in the series: not in the prose, code, diagrams, file names,
social cards or front matter. No "at work we…" or "in my current role"
framing. The pattern is presented on its own merits. Lessons and costs are
framed as consequences of the pattern ("this approach creates a data parity
problem"), not as anecdotes.

## Goals

- Explain ports and adapters for front-end engineers using one running example
  across all three posts.
- Show the full architecture: panel port, platform services, panel domain data
  and actions, base panel, external store, and four host adapters.
- Demonstrate the payoff concretely: the same panel code in four hosts, and in
  Storybook with no GraphQL, shell or network at all.
- Include an honest account of costs, including the unsolved end-to-end test
  data parity problem and the direction being explored.

## Non-goals

- Not a Module Federation, Apollo GraphQL, Storybook or Playwright tutorial.
  These appear only as adapter implementation details, with links out.
- Not a complete application inside the posts. Code samples are focused
  excerpts from the companion repository.
- Not a re-explanation of `useSyncExternalStore` rendering behaviour. Link to
  [Isolating React component updates with useSyncExternalStore](/blog/isolating-react-component-updates-with-usesyncexternalstore/)
  instead.

## Anti-goals (failure even if well written)

- Reads as a case study of a real employer's system, or exposes anything
  identifiable.
- Stays abstract: hexagon diagrams and terminology without code a reader could
  adapt.
- Oversells: presents the pattern as free, or hides the costs.

## The running example (invented)

A fictional **trading workstation**: a shell application hosting dockable
panels. The example panel is a **quote panel** that displays live prices for a
set of instruments and lets the user submit an order.

The **panel port** describes everything the panel needs:

- **Panel domain:** quote data (query and live updates) and actions
  (`submitOrder`, plus one editing action such as updating an order).
- **Platform services:** notifications, user settings, the event bus for
  inter-panel messages (for example, selecting an instrument in another panel)
  and theming, including the data grid theme.

The panel's UI and logic consume these only through hooks and never know which
host they run in.

**Adapters** (one per host):

| Host | How the port is fulfilled |
| --- | --- |
| Production shell | Panel loaded with Module Federation. Data and actions via a GraphQL client (Apollo) that the adapter owns; platform services from the shell. |
| Storybook | In-memory fakes. No GraphQL, shell or network. Any state can be shown, such as rejected orders or stale prices. |
| Test harness, tier 1 | Mocked backend with deterministic data. |
| Legacy desktop web view | Panel hosted in a web view in an older desktop application. Actions and data routed through the desktop app's own services across a message bridge, not GraphQL. |

Tier 2 end-to-end tests run against the deployed production shell.

## Series structure

Each post is roughly 1,500 words, TypeScript code samples, and zero to two
diagrams, matching the existing posts.

### Part 1: Ports and adapters for micro-frontends

- The problem: a panel coupled to its shell, backend and framework can't be
  developed, tested or reused anywhere else.
- Hexagonal architecture from first principles, explained in front-end terms
  rather than the original server-side framing.
- Defining the quote panel's port: domain data, actions and platform services.
- Why the API client belongs in the adapter, not the panel.
- **Diagram:** the panel hexagon with its port and the four adapters around it.
  Reused in Part 3.
- Close with the payoff preview: one panel, four hosts.
- This post must stand alone as the design reference.

### Part 2: Building the base panel

- The panel context: providing the port's implementation to the React tree.
- Hooks as the panel's only access to the outside world.
- The base panel: holds the port's abstractions, creates and owns the external
  store, exposes the shared hooks.
- **Extension and factory, as Phil designed it:**
  - The base panel port is generic. Panel-specific state and actions sit
    outside the base and are supplied as type parameters.
  - A concrete panel extends the base interface with its own state and
    actions, for example
    `interface QuotePanelPort extends PanelPort<QuoteState, QuoteActions>`.
  - A factory creates the panel from the parts an adapter supplies (the
    domain implementations and platform services). The factory builds the
    external store and the hooks, so concrete panels never manage the store's
    lifecycle.
- How the quote panel adds its own state, actions and hooks on top of the
  generic base.
- Why an external store: non-React sources such as event bus messages and live
  prices update state without re-rendering everything, and panel logic is
  testable without React. Link to the `useSyncExternalStore` post for the
  rendering detail.

### Part 3: One panel, many hosts

- Walk through each adapter for the same quote panel: Storybook, the tier 1
  harness, the production shell, and the legacy desktop web view.
- The two end-to-end test tiers and what each one proves.
- **The cost: test data parity.** The same specs run in both tiers, so mocked
  and live data must produce the same assertions. Data either comes from shared
  configuration or must be kept in sync by hand, and hand-kept data drifts.
- **Applying the pattern to tests:** a test port as the direction being
  explored.
  - `mount` extends a Playwright test fixture, in a style similar to Storybook's
    Component Story Format. In tier 1 it mounts the panel in the harness. In
    tier 2 it signs in to the deployed shell and drags the panel into the
    workspace.
  - Setup functions describe the starting state. Tier 1 seeds the mocks. Tier 2
    reaches the state through the application or its APIs.
  - Assertions are driven by the same configuration the setup used.
  - Presented honestly as work in progress, not a finished solution.
- Reuse the Part 1 diagram, with the test adapters added.

## Companion repository

A runnable version of the quote panel, linked from every post. The posts'
code samples are excerpts from it and must match it exactly, so **the
repository is built before the posts are written**. It is a separate project
with its own implementation plan.

Contents:

- The panel port, base panel factory, panel context and hooks.
- The quote panel.
- Adapters: Storybook (in-memory fakes), tier 1 test harness (mocked
  backend), and a small demo shell that loads the panel with Module
  Federation.
- A simulated legacy host: an iframe or separate page that talks to the panel
  over `postMessage`, standing in for the desktop web view bridge.
- Playwright tests written against the test port (`mount` fixture and setup
  functions), running in tier 1 against the harness and in tier 2 against the
  demo shell.

Constraints:

- The same no-employer rule applies: invented domain, no identifying names,
  and no code copied from Phil's work.
- Fake data only. The demo shell's "backend" can be a small mock GraphQL
  server so the Apollo-based adapter is real.
- Public repository on Phil's GitHub account, matching the blog's tooling
  (pnpm, TypeScript, ESLint, Prettier).

## Site conventions

- Posts in `/blog/` as Markdown, with `draft: true` until ready to publish.
- Series front matter (from the `feat/post-series` branch, PR not yet opened):

  ```yaml
  series:
    name: Hexagonal architecture for micro-frontends
    part: 1
  ```

- Tags: `react`, `typescript`, plus a new `architecture` tag.
- Diagrams as PNGs in `/img/blog/<slug>/` inside `<figure>` with descriptive
  alt text, following existing posts.
- Social cards generated with `pnpm run generate:social-card <slug>`.
- Prose checked with vale and codespell.

## Decided by Phil

- A three-part series rather than one long post.
- Audience across all levels, as described above.
- No reference to his employer or work.
- Test data parity is the cost to cover, with the test port as the direction
  being explored.
- In Storybook the panel needs no GraphQL or any backend.
- Panels use both interface extension and a factory: generic base, with
  panel state and actions as type parameters, and the factory building the
  panel from adapter-supplied parts.
- A companion repository.

## Claude's calls (open to override)

- The companion repository is built first, and its contents are as listed
  above.
- The legacy host is simulated with `postMessage` rather than a real desktop
  web view.
- The demo shell uses a small mock GraphQL server.
- The legacy host in the posts is "a web view in an older desktop
  application", with .NET only as an example.

- Working titles and the three-part split above.
- The invented trading workstation and quote panel as the running example.
- TypeScript for all code samples.
- One reusable diagram rather than several.
- New `architecture` tag.
- Order editing as the second example action, alongside submitting an order.

## Left to the writer

- Exact headings, prose and code sample boundaries within each post.
- Names of hooks, types and functions in the example code.
- Diagram styling.
