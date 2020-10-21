---
title: Caveats
---

There are a few things to keep in mind when workig with `watch` reactions.

### It is not allowed for reaction to modify store values it is using

Consider such reaction and store:

```ts
const myStore = store({ count: 1 });

watch(() => {
  // We're reading .count
  console.log(myStore.count);
  // But now we're changing it! It'll cause this reaction to run again!
  myStore.count++;
});
```

Code such as above would cause infinite loop of reaction re-running, as it is updating values it just used.

:::note

You can think about it in similar way as trying to modify react component state during the render:

```tsx {4}
function SomeComponent() {
  const [state, setState] = useState('foo');

  state = 'bar'; // this is not allowed
}
```

:::

:::caution

During watch reaction, modifying values currently used by the same reaction will throw an error.

:::

### Starting new watching while other reaction is running

By default, code like below will throw an error:

```ts
watch(() => {
  // ...some code
  watch(() => {
    // ... some other code
  });
});
```

Such code would create new watching reaction on each call of parent reaction and could quickly lead to nasty bugs and memory leaks.

This is, however, sometimes useful to perform such operations.

If you want to do so, you'll need to explicitly allow it using `allowNestedWatch` function like:

```ts
import { allowNestedWatch } from 'statek';

watch(() => {
  // ...some code
  const stop = allowNestedWatch(() =>
    watch(() => {
      // ... some other code
    }),
  );

  // !!! Always remember to stop nested reactions when needed!
});
```

:::caution

Remember that each watch reaction must be stopped by calling `stop` function it returns!

:::

Each `watch` reaction can also be async function.

Let's say, each time user opens new todo, we want to check all attachments and warn user if they contain viruses.

We could write such watch like:

```ts
// Selector from our previous example
const todoAttachments = selectorFamily(async todoId => {
  const attachments = await todoApi.getAttachments(todoId);
  return attachments;
});

watch(async () => {
  const { openedTodoId } = todos;

  // Note we're using await this time as there is no to suspend inside async function!
  const attachments = await todoAttachments(openedTodoId).promise;

  const warnings = await scanningApi.scanAttachments(attachments);

  if (warnings) {
    console.warn(`...`);
  }
});
```

Few notes here.

- Again, after each `await` phase - reaction will check if any previously used values changed. If this is the case - reaction will instantly cancel next steps and start over
- We're using `selector.promise` instead of `selector.value`. This is because we're in async function, so there is no need to suspend current reaction on each async read attempt.

:::note

Using `selector.read` for async selectors will throw inside async reactions.

:::
