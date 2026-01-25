---
title: Creating efficient React updates with useSyncExternalStore
description:
  Learn how to optimize React components by using useSyncExternalStore to
  subscribe to external data sources and trigger minimal re-renders only when
  specific data changes.
tags:
  - posts
  - react
  - javascript
  - performance
  - hooks
date: 2025-12-13
social_card: react-efficient-updates-usesyncexternalstore.jpg
draft: true
---

## Introduction

React's `useSyncExternalStore` hook provides a powerful way to subscribe to
external data sources while ensuring components only re-render when necessary.
Unlike traditional state management patterns that might trigger unnecessary
updates, this hook allows for precise control over when components should update
based on specific data changes.

This approach is particularly valuable when building complex UI components like
data grids, where different parts of the interface need to subscribe to specific
aspects of the data (rows, columns, sorting, filtering) without triggering
unnecessary re-renders across the entire grid.

## Basic useSyncExternalStore usage

The `useSyncExternalStore` hook requires two main arguments: a subscribe
function and a getSnapshot function. Here's a basic data grid store
implementation:

```js
class DataGridStore {
  constructor() {
    this.state = {
      rows: [
        { id: 1, name: "John Doe", email: "john@example.com", age: 28 },
        { id: 2, name: "Jane Smith", email: "jane@example.com", age: 32 },
        { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 45 },
      ],
      columns: [
        { id: "name", label: "Name", width: 150 },
        { id: "email", label: "Email", width: 200 },
        { id: "age", label: "Age", width: 80 },
      ],
      sortBy: null,
      sortDirection: "asc",
      selectedRows: new Set(),
    };
    this.listeners = new Set();
  }

  subscribe = (callback) => {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  };

  getSnapshot = () => {
    return this.state;
  };

  updateRows = (newRows) => {
    this.state = { ...this.state, rows: newRows };
    this.listeners.forEach((callback) => callback());
  };

  sortByColumn = (columnId) => {
    const direction =
      this.state.sortBy === columnId && this.state.sortDirection === "asc"
        ? "desc"
        : "asc";

    const sortedRows = [...this.state.rows].sort((a, b) => {
      if (direction === "asc") {
        return a[columnId] > b[columnId] ? 1 : -1;
      }
      return a[columnId] < b[columnId] ? 1 : -1;
    });

    this.state = {
      ...this.state,
      rows: sortedRows,
      sortBy: columnId,
      sortDirection: direction,
    };
    this.listeners.forEach((callback) => callback());
  };
}

const gridStore = new DataGridStore();
```

Using the store in a React data grid component:

```jsx
import { useSyncExternalStore } from "react";

function DataGrid() {
  const gridState = useSyncExternalStore(
    gridStore.subscribe,
    gridStore.getSnapshot,
  );
  const style = { width: column.width };

  return (
    <table>
      <thead>
        <tr>
          {gridState.columns.map((column) => (
            <th
              key={column.id}
              style={style}
              onClick={() => gridStore.sortByColumn(column.id)}>
              {column.label}
              {gridState.sortBy === column.id && (
                <span>{gridState.sortDirection === "asc" ? " ↑" : " ↓"}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {gridState.rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>{row.age}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

This component will re-render whenever any part of the grid state changes -
whether it's the data, sorting, or column configuration. For a large data grid,
this can lead to performance issues.

## Optimizing with selective subscriptions

To create more efficient updates, we can modify our data grid store to support
selective subscriptions. This allows different parts of the grid to subscribe
only to the data they need:

```js
class OptimizedDataGridStore {
  constructor() {
    this.state = {
      rows: [
        { id: 1, name: "John Doe", email: "john@example.com", age: 28 },
        { id: 2, name: "Jane Smith", email: "jane@example.com", age: 32 },
        { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 45 },
      ],
      columns: [
        { id: "name", label: "Name", width: 150 },
        { id: "email", label: "Email", width: 200 },
        { id: "age", label: "Age", width: 80 },
      ],
      sortBy: null,
      sortDirection: "asc",
      selectedRows: new Set(),
      filter: "",
      pagination: { page: 1, pageSize: 10, total: 3 },
    };
    this.listeners = new Map();
  }

  subscribe = (callback, selectorKey) => {
    const key = selectorKey || "all";
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  };

  getSnapshot = (selector) => {
    if (!selector) return this.state;
    return selector(this.state);
  };

  notifyListeners = (changedKeys) => {
    // Notify general listeners
    const allListeners = this.listeners.get("all");
    if (allListeners) {
      allListeners.forEach((callback) => callback());
    }

    // Notify specific listeners only if their data changed
    changedKeys.forEach((key) => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.forEach((callback) => callback());
      }
    });
  };

  updateRows = (newRows) => {
    this.state = {
      ...this.state,
      rows: newRows,
      pagination: { ...this.state.pagination, total: newRows.length },
    };
    this.notifyListeners(["rows", "pagination"]);
  };

  sortByColumn = (columnId) => {
    const direction =
      this.state.sortBy === columnId && this.state.sortDirection === "asc"
        ? "desc"
        : "asc";

    const sortedRows = [...this.state.rows].sort((a, b) => {
      if (direction === "asc") {
        return a[columnId] > b[columnId] ? 1 : -1;
      }
      return a[columnId] < b[columnId] ? 1 : -1;
    });

    this.state = {
      ...this.state,
      rows: sortedRows,
      sortBy: columnId,
      sortDirection: direction,
    };
    this.notifyListeners(["rows", "sort"]);
  };

  updateColumnWidth = (columnId, width) => {
    this.state = {
      ...this.state,
      columns: this.state.columns.map((col) =>
        col.id === columnId ? { ...col, width } : col,
      ),
    };
    this.notifyListeners(["columns"]);
  };

  setFilter = (filter) => {
    this.state = { ...this.state, filter };
    this.notifyListeners(["filter"]);
  };
}

const optimizedGridStore = new OptimizedDataGridStore();
```

Now we can create specialized hooks for different parts of the grid:

```jsx
function useGridRows() {
  return useSyncExternalStore(
    (callback) => optimizedGridStore.subscribe(callback, "rows"),
    () => optimizedGridStore.getSnapshot((state) => state.rows),
  );
}

function useGridColumns() {
  return useSyncExternalStore(
    (callback) => optimizedGridStore.subscribe(callback, "columns"),
    () => optimizedGridStore.getSnapshot((state) => state.columns),
  );
}

function useGridSort() {
  return useSyncExternalStore(
    (callback) => optimizedGridStore.subscribe(callback, "sort"),
    () =>
      optimizedGridStore.getSnapshot((state) => ({
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
      })),
  );
}

function useGridFilter() {
  return useSyncExternalStore(
    (callback) => optimizedGridStore.subscribe(callback, "filter"),
    () => optimizedGridStore.getSnapshot((state) => state.filter),
  );
}
```

Now we can build efficient grid components:

```jsx
// Header component - only re-renders when columns or sort changes
function GridHeader() {
  const columns = useGridColumns();
  const { sortBy, sortDirection } = useGridSort();
  const style = { width: column.width };

  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.id}
            style={style}
            onClick={() => optimizedGridStore.sortByColumn(column.id)}>
            {column.label}
            {sortBy === column.id && (
              <span>{sortDirection === "asc" ? " ↑" : " ↓"}</span>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// Body component - only re-renders when rows change
function GridBody() {
  const rows = useGridRows();

  return (
    <tbody>
      {rows.map((row) => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.email}</td>
          <td>{row.age}</td>
        </tr>
      ))}
    </tbody>
  );
}

// Filter component - only re-renders when filter changes
function GridFilter() {
  const filter = useGridFilter();

  return (
    <input
      type="text"
      placeholder="Filter..."
      value={filter}
      onChange={(e) => optimizedGridStore.setFilter(e.target.value)}
    />
  );
}

// Main grid component
function OptimizedDataGrid() {
  return (
    <div>
      <GridFilter />
      <table>
        <GridHeader />
        <GridBody />
      </table>
    </div>
  );
}
```

With this approach, changing the filter won't re-render the header or body,
sorting won't re-render the filter, and column width changes won't re-render the
data rows.

## Advanced patterns for complex state

For more complex data grid scenarios, you can implement derived state, virtual
scrolling, and complex filtering with memoized selectors:

```js
class AdvancedDataGridStore {
  constructor() {
    this.state = {
      rawRows: this.generateLargeDataset(10000), // Large dataset
      columns: [
        { id: "id", label: "ID", width: 80, type: "number" },
        { id: "name", label: "Name", width: 150, type: "string" },
        { id: "email", label: "Email", width: 200, type: "string" },
        { id: "age", label: "Age", width: 80, type: "number" },
        { id: "department", label: "Department", width: 120, type: "string" },
        { id: "salary", label: "Salary", width: 100, type: "currency" },
      ],
      sortBy: null,
      sortDirection: "asc",
      filters: new Map(),
      pagination: { page: 1, pageSize: 50 },
      virtualScrolling: { startIndex: 0, endIndex: 50 },
      selectedRows: new Set(),
    };
    this.listeners = new Map();
    this.cache = new Map();
  }

  generateLargeDataset = (size) => {
    const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance"];
    return Array.from({ length: size }, (_, i) => ({
      id: i + 1,
      name: `Employee ${i + 1}`,
      email: `employee${i + 1}@company.com`,
      age: Math.floor(Math.random() * 40) + 25,
      department: departments[Math.floor(Math.random() * departments.length)],
      salary: Math.floor(Math.random() * 80000) + 40000,
    }));
  };

  subscribe = (callback, selectorKey) => {
    const key = selectorKey || "all";
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  };

  getSnapshot = (selector) => {
    if (!selector) return this.state;

    // Memoization for expensive computations
    const selectorKey = selector.name || selector.toString();
    const cacheKey = `${selectorKey}_${JSON.stringify(this.state.filters)}_${this.state.sortBy}_${this.state.sortDirection}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.rawRowsLength === this.state.rawRows.length) {
        return cached.result;
      }
    }

    const result = selector(this.state);
    this.cache.set(cacheKey, {
      result,
      rawRowsLength: this.state.rawRows.length,
    });
    return result;
  };

  // Efficient filtered and sorted data computation
  getProcessedRows = () => {
    let rows = this.state.rawRows;

    // Apply filters
    if (this.state.filters.size > 0) {
      rows = rows.filter((row) => {
        return Array.from(this.state.filters.entries()).every(
          ([columnId, filterValue]) => {
            const cellValue = String(row[columnId]).toLowerCase();
            return cellValue.includes(filterValue.toLowerCase());
          },
        );
      });
    }

    // Apply sorting
    if (this.state.sortBy) {
      const { sortBy, sortDirection } = this.state;
      rows = [...rows].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (sortDirection === "asc") {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        }
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      });
    }

    return rows;
  };

  notifyListeners = (changedKeys) => {
    // Clear relevant cache entries
    if (changedKeys.some((key) => ["filters", "sort", "rows"].includes(key))) {
      this.cache.clear();
    }

    const allListeners = this.listeners.get("all");
    if (allListeners) {
      allListeners.forEach((callback) => callback());
    }

    changedKeys.forEach((key) => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.forEach((callback) => callback());
      }
    });
  };

  setColumnFilter = (columnId, value) => {
    const newFilters = new Map(this.state.filters);
    if (value.trim() === "") {
      newFilters.delete(columnId);
    } else {
      newFilters.set(columnId, value);
    }

    this.state = {
      ...this.state,
      filters: newFilters,
      pagination: { ...this.state.pagination, page: 1 }, // Reset to first page
    };
    this.notifyListeners(["filters", "pagination", "visibleRows"]);
  };

  setVirtualScrollRange = (startIndex, endIndex) => {
    this.state = {
      ...this.state,
      virtualScrolling: { startIndex, endIndex },
    };
    this.notifyListeners(["virtualScrolling"]);
  };

  sortByColumn = (columnId) => {
    const direction =
      this.state.sortBy === columnId && this.state.sortDirection === "asc"
        ? "desc"
        : "asc";

    this.state = {
      ...this.state,
      sortBy: columnId,
      sortDirection: direction,
    };
    this.notifyListeners(["sort", "visibleRows"]);
  };
}

const advancedGridStore = new AdvancedDataGridStore();

// Memoized selector functions
const selectProcessedRows = (state) => {
  return advancedGridStore.getProcessedRows();
};

const selectVisibleRows = (state) => {
  const processedRows = advancedGridStore.getProcessedRows();
  const { startIndex, endIndex } = state.virtualScrolling;
  return processedRows.slice(startIndex, endIndex);
};

const selectGridStats = (state) => {
  const processedRows = advancedGridStore.getProcessedRows();
  return {
    totalRows: state.rawRows.length,
    filteredRows: processedRows.length,
    currentPage: state.pagination.page,
    pageSize: state.pagination.pageSize,
  };
};

// Specialized hooks for different aspects of the grid
function useVisibleGridRows() {
  return useSyncExternalStore(
    (callback) => advancedGridStore.subscribe(callback, "visibleRows"),
    () => advancedGridStore.getSnapshot(selectVisibleRows),
  );
}

function useGridStats() {
  return useSyncExternalStore(
    (callback) => advancedGridStore.subscribe(callback, "stats"),
    () => advancedGridStore.getSnapshot(selectGridStats),
  );
}

function useColumnFilters() {
  return useSyncExternalStore(
    (callback) => advancedGridStore.subscribe(callback, "filters"),
    () => advancedGridStore.getSnapshot((state) => state.filters),
  );
}

// Advanced grid components with virtual scrolling
function VirtualizedGridBody() {
  const visibleRows = useVisibleGridRows();
  const { startIndex } = useSyncExternalStore(
    (callback) => advancedGridStore.subscribe(callback, "virtualScrolling"),
    () => advancedGridStore.getSnapshot((state) => state.virtualScrolling),
  );

  return (
    <tbody>
      {visibleRows.map((row, index) => (
        <tr key={row.id} data-index={startIndex + index}>
          <td>{row.id}</td>
          <td>{row.name}</td>
          <td>{row.email}</td>
          <td>{row.age}</td>
          <td>{row.department}</td>
          <td>${row.salary.toLocaleString()}</td>
        </tr>
      ))}
    </tbody>
  );
}

function GridColumnFilter({ columnId }) {
  const filters = useColumnFilters();
  const currentFilter = filters.get(columnId) || "";
  const style = { width: "100%", padding: "4px" };

  return (
    <input
      type="text"
      value={currentFilter}
      onChange={(e) =>
        advancedGridStore.setColumnFilter(columnId, e.target.value)
      }
      placeholder={`Filter ${columnId}...`}
      style={style}
    />
  );
}

function GridStatsFooter() {
  const stats = useGridStats();
  const style = { padding: "8px", fontSize: "14px" };

  return (
    <div style={style}>
      Showing {stats.filteredRows} of {stats.totalRows} rows
      {stats.filteredRows !== stats.totalRows && <span> (filtered)</span>}
    </div>
  );
}
```

This advanced pattern provides:

- Efficient filtering and sorting of large datasets
- Virtual scrolling for performance with thousands of rows
- Granular subscriptions so different grid parts only update when needed
- Memoization to avoid expensive recomputations
- Separation of concerns with specialized hooks for each grid aspect

## Performance considerations

When using `useSyncExternalStore` for data grids, these performance
optimizations are crucial:

**1. Stable selector functions for grid operations:**

```jsx
// Bad - creates new function on every render, causing unnecessary re-renders
function DataGridCell({ rowIndex, columnId }) {
  const cellValue = useSyncExternalStore(gridStore.subscribe, () =>
    gridStore.getSnapshot((state) => state.rows[rowIndex]?.[columnId]),
  );

  return <td>{cellValue}</td>;
}

// Good - stable selector function
const createCellSelector = (rowIndex, columnId) => (state) =>
  state.rows[rowIndex]?.[columnId];

function DataGridCell({ rowIndex, columnId }) {
  // Memoize the selector to prevent recreation
  const selector = useMemo(
    () => createCellSelector(rowIndex, columnId),
    [rowIndex, columnId],
  );

  const cellValue = useSyncExternalStore(gridStore.subscribe, () =>
    gridStore.getSnapshot(selector),
  );

  return <td>{cellValue}</td>;
}
```

**2. Minimize subscription scope for large grids:**

```jsx
// Less efficient - entire grid re-renders when any data changes
function LargeDataGrid() {
  const gridState = useSyncExternalStore(
    gridStore.subscribe,
    gridStore.getSnapshot,
  );

  return (
    <div>
      <GridHeader columns={gridState.columns} sortState={gridState} />
      <GridBody rows={gridState.rows} />
      <GridFooter stats={gridState} />
    </div>
  );
}

// More efficient - each component subscribes only to relevant data
function LargeDataGrid() {
  return (
    <div>
      <GridHeader /> {/* Only subscribes to columns + sort */}
      <GridBody /> {/* Only subscribes to visible rows */}
      <GridFooter /> {/* Only subscribes to stats */}
    </div>
  );
}
```

**3. Use reference equality for complex grid data:**

```js
class PerformantGridStore {
  constructor() {
    this.state = {
      rows: [],
      processedRowsCache: null,
      lastProcessedKey: null,
    };
  }

  getSnapshot = (selector) => {
    if (!selector) return this.state;

    const result = selector(this.state);

    // For arrays and objects, return the same reference if contents haven't changed
    if (Array.isArray(result) && this.lastResult) {
      if (this.arraysEqual(result, this.lastResult)) {
        return this.lastResult;
      }
    }

    this.lastResult = result;
    return result;
  };

  arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    return a.every((item, index) => item === b[index]);
  };

  // Cache expensive computations
  getFilteredRows = () => {
    const cacheKey = `${this.state.sortBy}_${this.state.sortDirection}_${JSON.stringify([...this.state.filters.entries()])}`;

    if (
      this.state.lastProcessedKey === cacheKey &&
      this.state.processedRowsCache
    ) {
      return this.state.processedRowsCache;
    }

    // Expensive filtering and sorting logic here
    const processedRows = this.computeProcessedRows();

    this.state.processedRowsCache = processedRows;
    this.state.lastProcessedKey = cacheKey;

    return processedRows;
  };
}
```

**4. Optimize virtual scrolling with windowing:**

```jsx
function VirtualizedDataGrid() {
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 40;
  const containerHeight = 400;

  // Calculate visible range based on scroll position
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / rowHeight) + 1,
    totalRows,
  );

  // Only subscribe to visible rows
  const visibleRows = useSyncExternalStore(
    (callback) => gridStore.subscribe(callback, "visibleRows"),
    () =>
      gridStore.getSnapshot((state) =>
        gridStore.getFilteredRows().slice(startIndex, endIndex),
      ),
  );

  // Update virtual scroll range when scroll position changes
  useEffect(() => {
    gridStore.setVirtualScrollRange(startIndex, endIndex);
  }, [startIndex, endIndex]);

  const containerStyle = { height: containerHeight, overflow: "auto" };
  const virtualContainerStyle = {
    height: totalRows * rowHeight,
    position: "relative",
  };

  return (
    <div
      style={containerStyle}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}>
      <div style={virtualContainerStyle}>
        {visibleRows.map((row, index) => {
          const rowStyle = {
            position: "absolute",
            top: (startIndex + index) * rowHeight,
            height: rowHeight,
            width: "100%",
          };

          return (
            <div key={row.id} style={rowStyle}>
              <GridRow row={row} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**5. Debounce expensive operations:**

```jsx
function GridSearch() {
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search to avoid excessive filtering
  const debouncedSearch = useMemo(
    () =>
      debounce((term) => {
        gridStore.setGlobalFilter(term);
      }, 300),
    [],
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search across all columns..."
    />
  );
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

These optimizations ensure your data grid remains responsive even with large
datasets and complex interactions.

## Conclusion

`useSyncExternalStore` provides a robust foundation for creating efficient React
applications that subscribe to external data sources. By implementing selective
subscriptions and following performance best practices, you can build components
that update precisely when needed, leading to better user experiences and
optimized rendering performance.

The key is to design your store with granular subscriptions in mind and use
stable selector functions to minimize unnecessary re-renders. This approach
scales well from simple counters to complex applications with multiple data
sources and derived state.

## Integration with Zustand

While building custom stores gives you full control, you can also integrate
`useSyncExternalStore` with existing state management libraries like Zustand for
even more powerful data grid implementations:

```js
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const useDataGridStore = create(
  subscribeWithSelector((set, get) => ({
    rows: [
      { id: 1, name: "John Doe", email: "john@example.com", age: 28 },
      { id: 2, name: "Jane Smith", email: "jane@example.com", age: 32 },
      { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 45 },
    ],
    columns: [
      { id: "name", label: "Name", width: 150 },
      { id: "email", label: "Email", width: 200 },
      { id: "age", label: "Age", width: 80 },
    ],
    sortBy: null,
    sortDirection: "asc",
    filter: "",

    // Actions
    updateRows: (newRows) => set({ rows: newRows }),

    sortByColumn: (columnId) => {
      const { sortBy, sortDirection, rows } = get();
      const direction =
        sortBy === columnId && sortDirection === "asc" ? "desc" : "asc";

      const sortedRows = [...rows].sort((a, b) => {
        if (direction === "asc") {
          return a[columnId] > b[columnId] ? 1 : -1;
        }
        return a[columnId] < b[columnId] ? 1 : -1;
      });

      set({
        rows: sortedRows,
        sortBy: columnId,
        sortDirection: direction,
      });
    },

    setFilter: (filter) => set({ filter }),

    // Computed values
    get filteredRows() {
      const { rows, filter } = get();
      if (!filter) return rows;

      return rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(filter.toLowerCase()),
        ),
      );
    },
  })),
);
```

Create selective subscription hooks using Zustand's subscribe method:

```jsx
function useGridRows() {
  return useSyncExternalStore(
    (callback) => useDataGridStore.subscribe((state) => state.rows, callback),
    () => useDataGridStore.getState().rows,
  );
}

function useGridSort() {
  return useSyncExternalStore(
    (callback) =>
      useDataGridStore.subscribe(
        (state) => ({
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
        }),
        callback,
      ),
    () => {
      const { sortBy, sortDirection } = useDataGridStore.getState();
      return { sortBy, sortDirection };
    },
  );
}

function useGridFilter() {
  return useSyncExternalStore(
    (callback) => useDataGridStore.subscribe((state) => state.filter, callback),
    () => useDataGridStore.getState().filter,
  );
}

function useFilteredRows() {
  return useSyncExternalStore(
    (callback) =>
      useDataGridStore.subscribe(
        (state) => [state.rows, state.filter], // Subscribe to dependencies
        callback,
      ),
    () => useDataGridStore.getState().filteredRows,
  );
}
```

Using these hooks in components:

```jsx
function ZustandDataGrid() {
  return (
    <div>
      <ZustandGridFilter />
      <table>
        <ZustandGridHeader />
        <ZustandGridBody />
      </table>
    </div>
  );
}

function ZustandGridFilter() {
  const filter = useGridFilter();
  const setFilter = useDataGridStore((state) => state.setFilter);

  return (
    <input
      type="text"
      placeholder="Filter rows..."
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
    />
  );
}

function ZustandGridHeader() {
  const { sortBy, sortDirection } = useGridSort();
  const columns = useSyncExternalStore(
    (callback) =>
      useDataGridStore.subscribe((state) => state.columns, callback),
    () => useDataGridStore.getState().columns,
  );
  const sortByColumn = useDataGridStore((state) => state.sortByColumn);

  return (
    <thead>
      <tr>
        {columns.map((column) => {
          const style = { width: column.width };

          return (
            <th
              key={column.id}
              style={style}
              onClick={() => sortByColumn(column.id)}>
              {column.label}
              {sortBy === column.id && (
                <span>{sortDirection === "asc" ? " ↑" : " ↓"}</span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function ZustandGridBody() {
  const filteredRows = useFilteredRows();

  return (
    <tbody>
      {filteredRows.map((row) => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.email}</td>
          <td>{row.age}</td>
        </tr>
      ))}
    </tbody>
  );
}
```

This Zustand approach provides several benefits:

- **DevTools Integration**: Built-in Redux DevTools support for debugging
- **Middleware Support**: Easy integration with persistence, immer, and other
  middleware
- **TypeScript Support**: Excellent TypeScript integration out of the box
- **Computed Values**: Built-in support for derived state with getters
- **Selective Subscriptions**: Fine-grained subscriptions using
  `subscribeWithSelector`

The combination of Zustand's developer experience with `useSyncExternalStore`'s
performance optimizations creates a powerful foundation for complex data grid
implementations.
