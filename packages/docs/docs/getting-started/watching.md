---
title: Watching
---

Having the store, we can start watching it providing reaction function.

```ts
const myStore = store({ count: 0 });

watch(() => {
  console.log(`Current count is ${myStore.count}`);
});
```

By running snippet allow, console will log

```
Current count is 0
```

:::note

By default, reaction function will be called for the first time instantly. Manual reaction calling will be covered in next sections of this docs.

:::

---

While watching is running, we can modify the store in any way and reactions watching it will be called automatically

```ts
const myStore = store({ count: 0 });

watch(() => {
  console.log(`Current count is ${myStore.count}`);
});

// calling later:
myStore.count++;
```

In example above, console output would be:

```
Current count is 0
Current count is 1
```

### Stop watching

At any point, we can stop watching

```ts
const stop = watch(() => {
  console.log(`Current count is ${myStore.count}`);
});

// To stop watching call
stop();
```

### Only used store data will trigger reaction to run again

If we'll more complex store and only part of it is used during the reaction:

```ts
const myStore = store({ count: 0, name: 'Bob' });

watch(() => {
  console.log(`Current count is ${myStore.count}`);
});
```

They'll only re-run if part of the store they used changes.

Therefore, calling

```ts
myStore.name = 'Emma';
```

Will not trigger reaction to run again, as it is not used during the reaction.
