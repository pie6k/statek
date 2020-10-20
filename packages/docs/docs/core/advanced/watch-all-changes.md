---
title: Watch all changes
---

It is possible to watch any change made to some store.

```ts
import { watchAllChanges } from 'statek';

const myStore = store({ count: 1, foo: 'bar' });

const stop = watchAllChanges(myStore, () => {
  // This callback will be called when changes to the store are made
  console.log('myStore changed!');
});
```

Every time **any** change is made to `myStore`, provided callback will be fired.

By calling

```ts
myStore.count++;
```

We'll see

```
myStore changed
```

in the console.
