---
title: Isolating React component updates with useSyncExternalStore
description:
  Updating a single piece of state in React can trigger re-renders across your
  entire component tree. We'll explore how useSyncExternalStore lets components
  subscribe to only the state they care about, isolating updates and avoiding
  unnecessary re-renders for better performance.
date: 2026-01-27
draft: true
social_card: isolating-react-component-updates-with-usesyncexternalstore.jpg
---

## The shopping list example

A simple shopping list where you tap items to mark them as done. Each item has a description and a done status - nothing fancy, just enough to show the re-render behaviour.

## Approach 1: State in the parent component

The typical React pattern is to hold state in a parent component and pass it down as props. The parent owns the items array and provides a callback to toggle each item's done status.

### The parent component

State lives at the top. The parent provides callbacks for adding and toggling items.

```tsx
function App() {
  const [items, setItems] = useState<Item[]>([]);

  const addItem = (description: string) => {
    setItems(items => [
      ...items,
      { id: crypto.randomUUID(), description, done: false }
    ]);
  };

  const toggleItem = (id: string) => {
    setItems(items =>
      items.map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  return (
    <>
      <AddItemForm onAdd={addItem} />
      <ShoppingList items={items} onToggle={toggleItem} />
    </>
  );
}
```

### The form and list components

The form and list receive callbacks from the parent.

```tsx
function AddItemForm({ onAdd }: { onAdd: (description: string) => void }) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAdd(description);
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit">Add</button>
    </form>
  );
}

function ShoppingList({ items, onToggle }: ShoppingListProps) {
  return (
    <ul>
      {items.map(item => (
        <ShoppingItem key={item.id} item={item} onToggle={onToggle} />
      ))}
    </ul>
  );
}
```

### The item component

Each item receives its data and a toggle callback as props.

{% raw %}
```tsx
function ShoppingItem({ item, onToggle }: ShoppingItemProps) {
  return (
    <li>
      <button onClick={() => onToggle(item.id)}>
        <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
          {item.description}
        </span>
      </button>
    </li>
  );
}
```
{% endraw %}

### The re-render problem

When you toggle one item, the parent's state changes. This re-renders the parent, which re-renders every `ShoppingItem` - even the ones that didn't change. With a handful of items this is fine, but as the list grows the wasted renders add up.

## Approach 2: External store with useSyncExternalStore

Instead of pushing state down from a parent, each component can subscribe to an external store and only re-render when its specific data changes. React's `useSyncExternalStore` hook makes this straightforward.

### Creating the store

The store holds the state and tracks subscribers per item, so changes only notify the relevant subscriber.

```ts
let items: Item[] = initialItems;
const itemSubscribers = new Map<string, Set<() => void>>();
const idsSubscribers = new Set<() => void>();

export const store = {
  subscribeToItem(id: string, callback: () => void) {
    if (!itemSubscribers.has(id)) {
      itemSubscribers.set(id, new Set());
    }
    itemSubscribers.get(id)!.add(callback);
    return () => itemSubscribers.get(id)!.delete(callback);
  },
  subscribeToIds(callback: () => void) {
    idsSubscribers.add(callback);
    return () => idsSubscribers.delete(callback);
  },
  getItem: (id: string) => items.find(item => item.id === id),
  getItemIds: () => items.map(item => item.id),
  toggleItem(id: string) {
    items = items.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    itemSubscribers.get(id)?.forEach(cb => cb());
  },
  addItem(item: Item) {
    items = [...items, item];
    idsSubscribers.forEach(cb => cb());
  },
};
```

### Subscribing to the store

Each item component subscribes to updates for its specific item. When an item changes, only its subscriber gets notified.

{% raw %}
```tsx
function ShoppingItem({ id }: { id: string }) {
  const item = useSyncExternalStore(
    (callback) => store.subscribeToItem(id, callback),
    () => store.getItem(id)
  );

  return (
    <li>
      <button onClick={() => store.toggleItem(id)}>
        <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
          {item.description}
        </span>
      </button>
    </li>
  );
}
```
{% endraw %}

### The updated components

The parent subscribes to the list of item IDs. Adding or removing items elsewhere in the UI triggers a re-render here to update the list. But toggling an item's done status doesn't change the IDs, so the parent stays put.

```tsx
function ShoppingList() {
  const itemIds = useSyncExternalStore(
    store.subscribeToIds,
    store.getItemIds
  );

  return (
    <ul>
      {itemIds.map(id => (
        <ShoppingItem key={id} id={id} />
      ))}
    </ul>
  );
}
```

The form no longer needs a callback prop - it calls the store directly.

```tsx
function AddItemForm() {
  // ...
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    store.addItem({ id: crypto.randomUUID(), description, done: false });
    setDescription('');
  };
  // ...
}
```

Adding an item re-renders `ShoppingList` to pick up the new ID, but leaves individual `ShoppingItem` components alone.

### Measuring the improvement

Now when you toggle an item, only that single component re-renders. The React DevTools Profiler confirms this - one component update instead of the entire list.