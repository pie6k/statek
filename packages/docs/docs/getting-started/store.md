---
title: Store
---

To create the store, run following code

```ts
import { store } from 'statek';

const firstStore = store({ count: 0 });
```

Store can be used as normal plain JavaScript object.

```ts
console.log(firstStore.count); // will output 0
```

:::note

In next chapters of this tutorial, we'll skip `import` section in code examples.

:::

Now, as we have the store, we can start watching changes made to it.
