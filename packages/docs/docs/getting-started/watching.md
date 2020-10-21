---
title: Watching
---

:::note

This section uses parts of the code created in previous tutorial parts.

:::

If you've read previous **Views** chapter, you might already have some idea how watching works in Statek, but let's focus on it a bit more

Having the todos store ready, we can start watching it providing reaction function or using it inside react `view` component.

```tsx examples
//// React
const Todos = view(() => {
  return <div>Current todos count is {todos.list.length}</div>;
});
//// watch
import { watch } from 'statek';

watch(() => {
  console.log(`Current todos count is ${todos.list.length}`);
});
```

This will give us such output:

```
Current todos count is 2
```

:::note

By default, `watch` reaction function will be called for the first time instantly. Manual reaction calling will be covered in next sections of this docs.

:::

---

While watching is running or we're rendering any component using the store, we can modify the store in any way and reactions watching it will be called automatically

```ts
todos.add({ name: 'C', status: 'todo', owner: 'Anna' });
```

Reaction and components using the store will be instantly called and new output will be

```
Current todos count is 3
```

### Stop watching

At any point, we can stop watching reaction started with `watch` be using stop function returned from `watch`

```ts
const stop = watch(() => {
  console.log(`Current todos count is ${todos.list.length}`);
});

// Don't watch anymore!
stop();
```

### Reactions and re-renders are triggered only when _used_ data changes.

If some part of the store is changed, but it was never used by some component or reaction - it'll **not** cause it to be called again.

Let's see it in our example by extending our store with some new data

```ts {3}
const todos = store({
  list: [], // Same as in previous examples
  sharedWith: 'Anna',
});
```

Now, let's start using it

```tsx examples
//// React
const SharedInfo = view(() => {
  return <div>Your list is shared with {todos.sharedWith}</div>;
});

//// watch
watch(() => {
  console.log(`Your list is shared with ${todos.sharedWith}`);
});
```

Note we're now using only `todos.sharedWith` part of the store, which means we can safely ignore changes made to `todos.list`.

Now, let's add new todo:

```ts
todos.add(newTodo);
```

Changes will not triger reactions or components to be called again, as `.list` part of the store was never used.

If we'll however call

```ts
todos.sharedWith = 'Emma';
```

It will trigger reaction/component described above

```
Your list is shared with Emma
```
