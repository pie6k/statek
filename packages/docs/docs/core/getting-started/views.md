---
title: Views
---

:::note React only docs section

This section is required only if you use statek with React. If you want to use plain version of statek, feel free to skip this chapter

:::

Now as our store is created and have some helpers methods attached, we can create React component that will read from it and update itself each time used value changes.

Let's start by creating simple `Todos` component that shows todos count

```tsx {5}
const todos = store({
  list: [], // data from previous chapter
});

const Todos = view(() => {
  return <div>You have {todos.list.length} todos.</div>;
});
```

Note that we've wrapped our component function inside `view`

:::note

Each component using the store has to be wrapped with `view`

Exception from this rule is covered in 3rd-party components section

:::

Now let's add a new todo to our store

```ts
todos.add({ name: 'C', status: 'todo', owner: 'Anna' });
```

after we do this, `Todos` view will re-render showing new count!

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
          todos.add({ name: 'C', status: 'todo', owner: 'Anna' });
        }}
      >
        Add new todo
      </button>
    </>
  );
});
```

### Nested components using the same store

Let's introduce `Todo` component that will display single todo info inside our Todos component

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
          todos.add({ name: 'C', status: 'todo', owner: 'Anna' });
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
todos.updateTodo(1, { name: 'Foo' });
```

Only one `<Todo />` component that rendered Todo with id `1` will re-render.

Any other `Todo` and `Todos` component itself **will not** re-render as this change didn't impact them.

:::tip

View components are automatically `memo` components

:::
