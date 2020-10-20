---
title: Watching
---

Having the todos store ready, we can start watching it providing reaction function.

```ts
import { watch } from 'statek';

watch(() => {
  console.log(`Current todos count is ${todos.list.length}`);
});
```

By running snippet above, console will log

```
Current todos count is 2
```

:::note

By default, reaction function will be called for the first time instantly. Manual reaction calling will be covered in next sections of this docs.

:::

---

While watching is running, we can modify the store in any way and reactions watching it will be called automatically

```ts
todos.list.push({ id: 3, name: 'C', status: 'todo', owner: 'Anna' });
```

Reaction will be instantly called and console will output

```
Current todos count is 3
```

### Adding util functions to the store

Right now we called `todos.list.push` directly on the store, but it could be good idea to add such function to the store itself:

```ts
import { store } from 'statek';

const todos = store({
  list: [],
  add(todo) {
    todos.list.push(todo);
  },
});
```

Now we could add a new todo like:

```ts
todos.add({ id: 3, name: 'C', status: 'todo', owner: 'Anna' });
```

---

### Stop watching

At any point, we can stop watching be using stop function returned from `watch`

```ts
const stop = watch(() => {
  console.log(`Current todos count is ${todos.list.length}`);
});

// Don't watch anymore!
stop();
```

### Watching only part of the store

Reaction can watch only part of the store, so it should be called only when relevant values changes.

Let's extend our store with some new data

```ts
const todos = store({
  list: [], // Same as in previous examples
  sharedWith: 'Anna',
});
```

Now, let's start watching for newly added part

```ts
watch(() => {
  console.log(`Your list is shared with ${todos.sharedWith}`);
});
```

If now, we'll add new todo with:

```ts
todos.list.push(newTodo);
```

Our reaction will not be called, as it never used `.list` part of the store.

If we'll however call

```ts
todos.sharedWith = 'Emma';
```

Reaction will be triggered and output to the console:

```
Your list is shared with Emma
```
