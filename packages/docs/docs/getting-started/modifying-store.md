---
title: Modifying the store
---

:::note

This section uses parts of the code created in previous tutorial parts.

:::

Before we'll start watching the store, let's add some utility functions to it so it'll be easier to work with.

We can already modify the store calling code like this directly:

```ts
todos.list.push({
  id: 3,
  name: 'C',
  status: 'todo',
  owner: 'Anna',
});
```

It is however quite verbose and it might be good idea to add store related functions to the store itself. For example:

```ts
const todos = store({
  list: [],
  add(todo) {
    todo.id = getRandomId();
    todos.list.push(todo);
  },
});

function getRandomId() {
  return Math.random().toString(36).substr(2, 9); // nvylhzwvz
}
```

Now we could add new todo with

```ts
todos.add({
  name: 'C',
  status: 'todo',
  owner: 'Anna',
});
```

We can add a few more utility functions to our store:

```tsx
const todos = store({
  list: [], // Same as in previous examples
  // ...
  getTodo(id) {
    return todos.list.find(todo => todo.id);
  },
  updateTodo(id, { name, status }) {
    const todo = todos.getTodo(id);

    if (!todo) {
      console.warn(`No todo with id ${id} found.`);
      return;
    }

    name && todo.name = name;
    status && todo.status = status;
  },
  removeTodo(id) {
    const todo = todos.getTodo(id);

    if (!todo) {
      console.warn(`No todo with id ${id} found.`);
      return;
    }

    removeElementFromArray(todos.list, todo);
  }
});

// Simple utility function that removes element from existing array
function removeElementFromArray(array, element) {
  const itemIndex = array.indexOf(element);
  array.splice(itemIndex, 1);
}
```

Right now, our store is a bit more 'smart'. We can call `todos.removeTodo(1)` directly on it instead of modifying its data directly.

Having such utility functions is also useful for validation of performed operations, etc.

:::caution Don't use _this_ keyword

Note that inside utility functions, we don't use `this` keyword:

```tsx {5}
const todos = store({
  list: [], // Same as in previous examples
  // ...
  getTodo(id) {
    // We use todos.list instead of this.list!
    return todos.list.find(todo => todo.id);
  },
});
```

:::
