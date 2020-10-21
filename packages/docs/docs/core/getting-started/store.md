---
title: Store
---

We'll start by creating simple store for our todo list.

```ts
import { store } from 'statek';

const todos = store({
  list: [
    { id: 1, name: 'A', status: 'done', owner: 'Anna' },
    { id: 2, name: 'B', status: 'todo', owner: 'Tom' },
  ],
});
```

Store can be created with any valid JavaScript object.

:::tip

Store can also include JavaScript objects such as `Map`, `Set` etc. For example

````ts
store({
  list: new Set()
});
:::

### Reading from the store

After store is created, we can read from it as we would do with normal JavaScript object:

```ts
console.log(todos.list.length); // will output 2
````

Our store is ready to start watching changes we'll make to it.
