---
title: Isolating React component updates with useSyncExternalStore
description:
  Most React performance advice focuses on avoiding re-renders, but that's only
  half the story. The real cost often lies in reconciliation—React checking
  every component for changes even when they don't re-render.
date: 2026-03-01
social_card: isolating-react-component-updates-with-usesyncexternalstore.jpg
---

## The hidden cost of state updates

As described in the [React docs](https://react.dev/learn/render-and-commit),
component renders happen in a three-stage process: trigger, render and commit.

- **Stage 1**: Trigger occurs from either the initial render or from a state
  update.
- **Stage 2**: Render calls your component to see what has changed.
- **Stage 3**: Commit applies the changes to the DOM.

Most developers focus on stage 3 when discussing performance and fail to
understand the cost of stage 2 or how the trigger in stage 1 affects app
performance.

## A shopping list example

A simple shopping or to-do list app works well for demonstrating the hidden cost
of state updates when app state lacks proper structure. Here, a simple hierarchy
of components has a parent `ShoppingList` and children `ShoppingItem` with items
represented as an array of objects.

```js
// Items from API
const items = [
  { id: "1", description: "Milk" },
  { id: "2", description: "Bread" },
];
```

The list contains 100 items and a user toggles the done status of the item as
they shop.

## Approach 1: State in the parent component

In this approach, the parent `ShoppingList` component holds the done state in a
Map and passes it down as props to the `ShoppingItem` children. The items
themselves come from the API and don't change. Using `useCallback` caches the
toggle function between renders and `memo` keeps the `ShoppingItem` components
[pure](https://react.dev/learn/keeping-components-pure).

{% raw %}

```jsx
function ShoppingList({ allItems }) {
  // Track done status in a Map, keyed by item id
  const [doneState, setDoneState] = useState(() => new Map());

  // Cache the toggle function to keep ShoppingItem props stable
  const handleToggle = useCallback((id) => {
    setDoneState((prev) => {
      // Create a new Map to trigger a state update
      const next = new Map(prev);
      next.set(id, !prev.get(id));
      return next;
    });
  }, []);

  return (
    <ul>
      {/* Map over all items, passing done state as a prop */}
      {allItems.map((item) => (
        <ShoppingItem
          key={item.id}
          id={item.id}
          description={item.description}
          done={doneState.get(item.id) ?? false}
          onToggle={handleToggle}
        />
      ))}
    </ul>
  );
}

// Wrap in memo to skip re-render if props are unchanged
const ShoppingItem = memo(function ShoppingItem({
  id,
  description,
  done,
  onToggle,
}) {
  return (
    <li>
      <button
        onClick={() => onToggle(id)}
        aria-pressed={done}
        aria-label={`Set ${description} done`}>
        <span style={{ textDecoration: done ? "line-through" : "none" }}>
          {description}
        </span>
      </button>
    </li>
  );
});
```

{% endraw %}

This approach ticks the React performance checkboxes with `memo` on the
`ShoppingItem` component to skip rendering if the item props don't change and
`useCallback` to cache the toggle function, so where does it fall short?

### The problem

When you toggle an item, the state in the parent shopping list changes. React
reconciles the subtree checking every `ShoppingItem` component for prop changes.
The DOM barely changes, but the item mapping and done state lookup happens for
every item in the list. In this example, the time cost remains negligible, but in
a production app with more complex components and expensive renders this
compounds into significant performance issues.

<figure>
  <img src="/img/blog/isolating-react-component-updates-with-usesyncexternalstore/parent-state-update.png" alt="Flame graph showing the cost of reconciling the entire list when toggling one item with parent state" />
  <figcaption>
    Performance trace for toggling one item with parent state
  </figcaption>
</figure>

## Approach 2: External store with useSyncExternalStore

Instead of pushing state down from a parent, each `ShoppingItem` component can
subscribe to targeted updates from an external store and only re-render when its
specific data changes. React's `useSyncExternalStore` provides a hook that
subscribes to this external store to trigger renders when the relevant item data
changes.

Rather than pass the shopping item data as props from the parent, the
`ShoppingItem` component receives a single `id` prop and uses the store to get
the item data and subscribe to updates. The store manages the state of each item
and notifies subscribers when an item changes.

{% raw %}

```jsx
class Store {
  #items = new Map(); // Item data from API (id, description)
  #doneState = new Map(); // Done status, separate from item data
  #subscribers = new Map(); // Callbacks per item id

  constructor(items) {
    // Index items by id for fast lookup
    items.forEach((item) => this.#items.set(item.id, item));
  }

  getItem(id) {
    const item = this.#items.get(id);
    // Merge item data with done state
    return item
      ? { ...item, done: this.#doneState.get(id) ?? false }
      : undefined;
  }

  toggleItem(id) {
    if (this.#items.has(id)) {
      // Update done state and notify only subscribers for this item
      this.#doneState.set(id, !this.#doneState.get(id));
      this.#notify(id);
    }
  }

  subscribe(id, cb) {
    // Add callback to the set of subscribers for this item
    this.#subscribers.set(id, (this.#subscribers.get(id) ?? new Set()).add(cb));

    // Return unsubscribe function for cleanup
    return () => this.#subscribers.get(id)?.delete(cb);
  }

  #notify(id) {
    // Call all subscribers for this specific item
    this.#subscribers.get(id)?.forEach((cb) => cb());
  }
}

// Provide store to the component tree via context
const Context = createContext(null);

function ShoppingList({ allItems }) {
  return (
    <Context value={new Store(allItems)}>
      <ul>
        {/* Only pass id - each item fetches its own data from the store */}
        {allItems.map((item) => (
          <ShoppingItem key={item.id} id={item.id} />
        ))}
      </ul>
    </Context>
  );
}

function ShoppingItem({ id }) {
  const store = use(Context);

  // Subscribe to updates for this specific item only
  const item = useSyncExternalStore(
    (cb) => store.subscribe(id, cb), // Subscribe function
    () => store.getItem(id), // Get current snapshot
  );

  return (
    <li>
      <button
        onClick={() => store.toggleItem(id)}
        aria-pressed={item.done}
        aria-label={`Set ${item.description} done`}>
        <span style={{ textDecoration: item.done ? "line-through" : "none" }}>
          {item.description}
        </span>
      </button>
    </li>
  );
}
```

{% endraw %}

### The result

This approach requires more code than the parent state version, but the
separation of concerns improves. When you toggle an item, only that specific
`ShoppingItem` component re-renders because only that component subscribes to
updates for that item. The rest of the list remains unaffected, resulting in a
more efficient update process.

<figure>
  <img src="/img/blog/isolating-react-component-updates-with-usesyncexternalstore/external-store-update.png" alt="Flame graph showing only one component reconciles when toggling one item with per-item subscriptions" />
  <figcaption>
    Performance trace for toggling one item with per-item subscriptions - only one component reconciles
  </figcaption>
</figure>
