---
title: Manual watch
---

Sometimes you might want to watch if store values used by some function changed, but you don't want it to re-run automatically.

`manualWatch` function allows exactly that. First argument is normal reaction callback, and 2nd one is callback that will be called each time some of store values used by the reaction changes

```ts
import { manualWatch } from 'statek';

const myStore = store({ count: 1 });

const callReaction = manualWatch(
  () => {
    return myStore.count;
  },
  () => {
    console.log('Count changed! Call reaction again to get fresh results!');
  },
);
```

`manualWatch` reaction will not start until we call it for the first time with

```ts
const currentCount = callReaction();
```

### Stop manual reaction

If you want to stop receiving notifications about manual reaction used data updates, call `callReaction.stop()`:

```ts
const callReaction = manualWatch(
  () => {
    // reaction content
  },
  () => {
    // change callback
  },
);

// later on
callReaction.stop();
```

### Adding arguments

Manual reaction can accept any count of arguments:

```ts
const callReaction = manualWatch(
  multiplier => {
    return myStore.count * multiplier;
  },
  () => {
    // change callback
  },
);

callReaction(2);
```

:::caution

Calling manual reaction after it's stop function was called will throw an error.

:::
