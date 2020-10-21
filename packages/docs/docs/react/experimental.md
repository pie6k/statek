---
title: Experimental
---

:::caution

While some of those features are quite 'powerful' - they are experimental and might be unstable

:::

To enable experimental features call

```ts
import { enableExperimental } from '@statek/react';

// Before running any other statek code.
enableExperimental();
```

### Class components don't require being wrapped in `views`

Statek will automatically update all class components when store values they use change.

They will work like if they're wrapped with `view`, even if you don't wrap them.

There are no code changes required.

### useView

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
