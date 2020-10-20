---
title: Views
---

In order to make any componen re-render on store changes, it is needed to wrap it with `view` function.

Let's start with simple, todo store.

```tsx
import { store } from 'statek';
import { view } from '@statek/react';

const todos = store({
  list: [
    { id: 1, name: 'A', status: 'done', owner: 'Anna' },
    { id: 2, name: 'B', status: 'todo', owner: 'Tom' },
  ],
});

const Todos = view(() => {
  return <div>You have {todos.list.length} todos.</div>;
});
```

Such `Todos` view would re-render every time, when `.todos` change.

It can be changed both inside or outside of the component.

We can simply call

```ts
todos.list.push({ id: 3, name: 'C', status: 'todo', owner: 'Anna' });
```

and `Todos` view will re-render.

:::tip

It could be good idea to add function adding new todo to the store itself:

```ts
const todos = store({
  list: [],
  add(todo) {
    todos.list.push(todo);
  },
});
```

:::

### View watches only used parts of the store

Let's consider a bit more complex store:

```ts
const todos = store({
  list: [], // Same as in previous examples
  // other props...
  sharedWith: 'Anna',
});
```

And our view still only using `.list.length` field:

```tsx
const Todos = view(() => {
  return <div>You have {todos.list.length} todos.</div>;
});
```

Right now, if we'll change `sharedWith` prop of the store:

```ts
todos.sharedWith = 'Tom';
```

Our component **will not** re-render as it was not using it during its last render.

### Changing store inside the component

Our view can modify the store during some event etc. exactly the same way as we would modify the store outside of the component:

```tsx
const todos = store({ count: 1 });

const Todos = view(() => {
  return (
    <>
      <div>You have {todos.list.length} todos.</div>
      <button
        onClick={() => {
          todos.add({ id: 3, name: 'C', status: 'todo', owner: 'Anna' });
        }}
      >
        Add new todo
      </button>
    </>
  );
});
```

### Nested components using the same store

Let's introduce some new component that will be nested inside our Todos component

```tsx
const Todo = view(({ todo }) => {
  return (
    <div>
      Todo {todo.name} ({todo.status})
    </div>
  );
});

const Todos = view(() => {
  return (
    <div>
      {todos.list.map(todo => {
        return <Todo todo={todo} key={todo.id} />;
      })}
      <button
        onClick={() => {
          todos.add({ id: 3, name: 'C', status: 'todo', owner: 'Anna' });
        }}
      >
        Add new todo
      </button>
    </div>
  );
});
```

Now, if we'll modify only one task:

```ts
todos.list[0].name = 'Foo';
```

Only `<Todo />` component that rendered this specific component will be re-rendered

:::tip

View components are automatically `memo` components

:::

### Adding another utility function

It's often good practice to add utility functions to the store itself. Let's add `updateTodo` method.

Instead of updating task directly:

```ts
todos.list[0].name = 'Foo';
```

Let's modify our store:

```ts
const todos = store({
  list: [], // Same as in previous examples
  // other props...
  getTodo(id) {
    return todos.list.find(todo => todo.id);
  },
  updateTodo(id, { name, status }) {
    const todo = todos.getTodo(id);

    if (!todo) {
      console.warn(`No todo with id ${id} found.`);
    }

    name && todo.name = name;
    status && todo.status = status;
  },
});
```

With this update we can modify todos like

```ts
todos.updateTodo(1, { name: 'Foo' });
```
