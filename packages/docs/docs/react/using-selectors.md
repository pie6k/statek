---
title: Using selectors
---

:::note

In this part of the docs, we'll use the same selectors as described [here](/docs/core/getting-started/selectors).

It is hightly recommended to read it first.

:::

Views can read selectors values the same as you would access them directly or inside reactions.

Let's start with

In order to make any componen re-render on store changes, it is needed to wrap it with `view` function.

Let's consider very basic example;

```tsx
import { store } from 'statek';
import { view } from '@statek/react';

const myStore = store({ count: 1 });

const Hello = view(() => {
  return <div>{myStore.count}</div>;
});
```

Such `Hello` view would re-render every time, when `.count` changes.

It can be changed both inside or outside of the component.

We can simply call

```ts
myStore.count++;
```

and `Hello` view will re-render.

### View watches only used parts of the store

Let's consider a bit more complex store:

```ts
const myStore = store({ count: 1, name: 'Anna' });
```

And our view still only using `count` field:

```tsx
const Hello = view(() => {
  return <div>{myStore.count}</div>;
});
```

Right now, if we'll change `name` prop of the store:

```ts
myStore.name = 'Tom';
```

Our component **will not** re-render.

### Changing store inside the component

Our view can modify the store during some event etc. exactly the same way as we would modify the store outside of the component:

```tsx
const myStore = store({ count: 1 });

const Hello = view(() => {
  return (
    <div>
      Count is: {myStore.count}
      <button
        onClick={() => {
          myStore.count++;
        }}
      >
        Increase
      </button>
    </div>
  );
});
```

### Nested components using the same store

Let's introduce some new component that will be nested inside our Hello component

```tsx
const myStore = store({ count: 1, name: 'Tom' });

const Name = view(() => {
  return <div>Your name is {myStore.name}</div>;
});

const Hello = view(() => {
  return (
    <div>
      Count is: {myStore.count}
      <Name />
    </div>
  );
});
```

Now, if we'll modify `.name`:

```ts
myStore.name = 'Anna';
```

only nested `Name` component will re-render. Parent `Hello` component will not re-render in such case.

:::tip

View components are automatically `memo` components

:::
