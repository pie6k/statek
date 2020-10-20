---
title: Scheduling, Batching & Utilities
---

Often multiple changes can be made to the store quickly, but we would like reaction to be called only once.

Let's consider such example:

```ts
const myStore = store({ count: 1 });

watch(() => {
  console.log(`Count is ${myStore.count}`);
});

myStore.count++;
myStore.count++;
myStore.count++;
```

We're changing store state 3 times in a row and we might want to decide if reaction should be called each time or if it should be called only once after all operations are finished.

In Statek, this is called **scheduling**.

There are 2 built-in schedulers:

- async scheduler **(default)** - will collect all updates and run reaction on the next 'tick'.
- sync scheduler - will call reaction instantly

It is also possible to use custom scheduler.

:::note

By default, async scheduler is used

:::

### Default behaviour

Again, if running such code:

```ts
const myStore = store({ count: 1 });

watch(() => {
  console.log(`Count is ${myStore.count}`);
});

myStore.count++;
myStore.count++;
myStore.count++;
```

Output in the console would be

```
Count is 1
Count is 4
```

This is because first call is always executed instantly, while other would be scheduled using scheduler (and `async` scheduler is the default one).

### Setting reaction scheduler

To change scheduler, we can use 2nd parameter of `watch` function which allows us to provide various options.

```ts
watch(
  () => {
    console.log(`Count is ${myStore.count}`);
  },
  {
    scheduler: 'sync',
  },
);
```

In above example, if we'll run

```ts
myStore.count++;
myStore.count++;
myStore.count++;
```

Console would output

```
Count is 0
Count is 1
Count is 2
Count is 3
Count is 4
```

:::note

All other options avaliable are listed in API reference section

:::

The same option is avaliable in `manualWatch` and `watchAllChanges`.

## Batching functions

In example above, where we call

```ts
myStore.count++;
myStore.count++;
myStore.count++;
```

We could want to group those 3 operations together, while avoiding having to wait for the next tick, which is the case with async scheduler.

To do that, we can call such operations like:

```ts
import { batch } from 'statek';

batch(() => {
  myStore.count++;
  myStore.count++;
  myStore.count++;
});
```

Such call will collect all operations happening inside before flushing them and allowing any reaction to pick them.

## Other batching & scheduling functions

### sync

```ts
import { sync } from 'statek';

sync(() => {
  // operations
});
```

Will force sync scheduler for operations happening during the call.

:::tip

Operations inside `sync` are batched. Flush will not happen until the end of the call

:::

### syncEvery

```ts
import { syncEvery } from 'statek';

syncEvery(() => {
  // operations
});
```

Will flush after every single operation inside the call.

:::note

If `syncEvery` is called inside `batch` or `sync` - it will still flush after every operation.

:::

### dontWatch

Will not register any read operations during the call

```ts
import { dontWatch } from 'statek';

const myStore = store({ count: 1, name: 'Anna' });

watch(() => {
  console.log(myStore.count);

  dontWatch(() => {
    console.log(myStore.name);
  });
});
```

In example above, only `.count` read operation will be recorded. Therefore if we'll call

```ts
myStore.count++;
```

Reaction will be called again, but if we call

```ts
myStore.name = 'Bob';
```

Reaction will not be called.
