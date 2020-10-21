---
title: Hooks
---

### useWatch

Works the same way as regular `watch` method, excepts it'll automatically stop listening to changes when component unmounts

```tsx
const myStore = store({ count: 1 });

useWatch(() => {
  console.log(myStore.count);
});
```

You can also provide 2nd argument will will force watch to be restarted. It works the same way as 2nd argument in `useEffect` hook.

```tsx
const myStore = store({ count: 1 });
function User({ userId }) {
  useWatch(() => {
    console.log(`Count is ${myStore.count} and current user is ${userId}`);
  }, [userId]);
}
```

:::note

Use 2nd argument only for values that are not parts of the store.

:::

### useStore

Creates 'local' version of the store that is memoized between renders.

```tsx
function User({ userId }) {
  const store = useStore(() => ({ count: 1 }));

  // use store the same way as if it was created outside of the component
}
```

### useSelected

Sometimes you want to re-render component only for specific sort of store updates.

Let's say we have store with todo list and info about which todo is currently opened

```ts
const todos = store({
  list: [], // array of todos
  openedTodoId: null, // can be null or id of todo
});
```

Now we have component responsible for displaying single todo:

```tsx
const Todo = view(({ todo }) => {
  const isOpened = todo.id === todos.openedTodoId;

  if (isOpened) {
    // render detailed content
  }

  // ...
});
```

In such case - Todo component would re-render very time `openedTodoId` is changed, even if it was not opened before and after the change.

We can modify our code:

```tsx
const Todo = view(({ todo }) => {
  const isOpened = useSelected(() => todo.id === todos.openedTodoId);

  if (isOpened) {
    // render detailed content
  }

  // ...
});
```

With this simple change - our component will still check if it is opened now after each `openedTodoId` change, but will re-render only if returned value changes.

### useUpdateOnAnyChange

This hook is useful if we need to provide store value into 3rd party component we cannot wrap with `view`

```tsx
const DashboardPanel = view(() => {

  return (
    <>
      {/** TableComponent is not created by us */}
      <TableComponent data={store.usersData}>
    </>
  );
})

```

In such case, if `.usersData` changes - `DashboardPanel` will not re-render as it is not using it directly.

`DashboardPanel` will not re-render as well as it is not wrapped with `view`.

In such case we can modify our code:

```tsx
const DashboardPanel = view(() => {
  useUpdateOnAnyChange(store.usersData);

  return (
    <>
      {/** TableComponent is not created by us */}
      <TableComponent data={store.usersData}>
    </>
  );
})
```

Now, every time **any** part of `store.usersData` is changed, `DashboardPanel` will re-render.

### useStatefulWatch

Sometimes we want to keep some sort of local state during watching of the store. Let's say we have store:

```ts
const myStore = store({ count: 0 });
```

and we watch it, but we only want to output new information to the console on every 10th change.

We can accomplish it like:

```ts
// We provide function that returns watching function.
useStatefulWatch(() => {
  // Here we initialize our 'state'.
  // Note that store values read here will not be watched.
  let updatesSinceReset = 0;

  // here we can start watching the store
  return () => {
    updatesSinceReset++;
    const currentCount = myStore.count;
    const isCritical = currentCount > 4000;

    if (isCritical) {
      // log every time count is bigger than 4000.
      console.log(`Count is critical!`);
      return;
    }

    if (updatesSinceReset > 10) {
      console.log(
        `Count is normal - ${currentCount}. Will log again after 10 changes.`,
      );
      updatesSinceReset = 0;
    }
  };
});
```
