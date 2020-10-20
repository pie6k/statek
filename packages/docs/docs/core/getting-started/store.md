---
title: Store
---

We'll start by creating store for our todo list.

```ts
import { store } from 'statek';

const todos = store({
  list: [
    { id: 1, name: 'A', status: 'done', owner: 'Anna' },
    { id: 2, name: 'B', status: 'todo', owner: 'Tom' },
  ],
});
```

Store can be used as normal plain JavaScript object.

```ts
console.log(todos.list.length); // will output 2
```

:::note

In next chapters of this tutorial, we'll skip `import` section in code examples.

:::

Now, as we have the store, we can start watching changes made to it.
