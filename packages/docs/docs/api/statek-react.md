---
title: Api - @statek/react
sidebar_label: Statek - React
---

### view

Returns reactive version of provided component. Returned component has exactly the same props as provided one

```tsx
const Component = view(props => {
  // reading from the store is only allowed inside view components
  return <div>{someStore.value}</div>;
});
```

### useStore

Creates 'local' version of the store that is memoized between renders.

```tsx
function User({ userId }) {
  const store = useStore(() => ({ count: 1 }));

  // use store the same way as if it was created outside of the component
}
```

### useSelected

Watches stores or selectors using provided callback and re-renders only when returned value changes.

Let's say we have store with todo list and info about which todo is currently opened

```tsx
const Todo = view(({ todo }) => {
  const isOpened = useSelected(() => todo.id === todos.openedTodoId);

  if (isOpened) {
    // render detailed content
  }

  // ...
});
```

### useUpdateOnAnyChange

Will re-render component every time **any** value of provided store changes

This hook is useful if we need to provide store value into 3rd party component we cannot wrap with `view`

```tsx
const DashboardPanel = view(() => {

  return (
    <>
      {/** TableComponent is 3rd party component or we dont want to modify it */}
      <TableComponent data={store.usersData}>
    </>
  );
})

```

### useStatefulWatch

Allows creating watch effect that can have some internal 'state' in form of variables

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

### useWatch

Works the same way as regular `watch` method, excepts it'll automatically stop listening to changes when component unmounts

```tsx
const myStore = store({ count: 1 });

useWatch(() => {
  console.log(myStore.count);
});
```

### useView

:::caution

This feature is experimental

:::

Instead of wrapping your functional components with `view`, you can call `useView` before reading any value from the store

```tsx examples
//// view
const Component = view(() => {
  return <div>{store.value}</div>;
});
//// useView
function Component() {
  useView();
  return <div>{store.value}</div>;
}
```

### WatchContext

:::caution

This feature is experimental

:::

This one is useful when you use 3rd party components or have some large components you don't want to modify.

By default (stable solution) you can use `useUpdateOnAnyChange` described in hooks section.

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

:::info

`useUpdateOnAnyChange` is stable and is safe to be used. It is shown here only as an example

:::

This will work just fine, but the downside of it is that it will cause your component to re-render on **any** provided store part change, even if it was never used.

Instead, we can wrap 3rd party or component we dont want to modify with `WatchContext`:

```tsx
const DashboardPanel = view(() => {
  return (
    <>
      <WatchContext stores=[store.userData]>
        {/** TableComponent is not created by us */}
        <TableComponent data={store.usersData}>
      </WatchContext>
    </>
  );
})
```

This way, `WatchContext` will re-render only when any value used by any (even deeply nested) child changes.
