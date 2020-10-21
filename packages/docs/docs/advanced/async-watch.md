---
title: Async watch
---

:::note

This section uses parts of the code created in previous tutorial parts.

:::

:::note Use selectors instead, where possible

This feature can be usually replaced with async selectors and it is recommended to do so.

:::

Each `watch` reaction can also be async function.

Let's say, each time user opens new todo, we want to check all attachments and warn user if they contain viruses.

We could write such watch like:

```ts {7,11}
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

:::caution

In async functions always use `const value = await selector.promise` instead of `const value = selector.value`.

Using `selector.read` inside async functions will throw an error.

:::
