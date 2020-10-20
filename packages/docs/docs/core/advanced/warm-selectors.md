---
title: Selectors 'warming'
---

Quite often it might happen that some reaction or selector is reading value from 2 or more async selectors.

For example, we might need both comments and attachments for our todo.

In such case, we'll have 2 async selectors

```ts
const todoComments = selectorFamily(async todoId => {
  const comments = await todoApi.getComments(todoId);
  return comments;
});

const todoAttachments = selectorFamily(async todoId => {
  const attachments = await todoApi.getAttachments(todoId);
  return attachments;
});
```

Now, in our reaction, we might want to read both of those for opened task.

```ts
watch(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  const comments = todoComments(openedTodoId).value;
  const attachments = todoAttachments(openedTodoId).value;

  console.log(
    `We have ${comments.length}) comments and ${attachments.length} attachments`,
  );
});
```

This, however - will make such reaction **suspend** twice. First, when it tries to read comments, and then **after** comments selector resolves, when it tries to read attachments.

We might want to avoid that and somehow start requesting both values in parrell.

This is when `warmSelectors` function comes in handy.

We can modify our watch function like:

```ts
import { warmSelectors } from 'statek';

watch(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  // Note we're not calling `.value` on our selectors!
  warmSelectors(todoComments(openedTodoId), todoAttachments(openedTodoId));

  // Next time this reaction reaches this point,
  // we're guaranteed both selectors have their values ready to read.
  const comments = todoComments(openedTodoId).value;
  const attachments = todoAttachments(openedTodoId).value;

  console.log(
    `We have ${comments.length}) comments and ${attachments.length} attachments`,
  );
});
```

This way, we let both selectors know that some value is requested **before** we actually try to read it.

This will make such reaction to suspend only once.

When it tries to read comments data - it'll suspend, but as we warmed attachments selector as well, this reaction knows that it needs to wait for those as well.

This means that it'll run again only when both selectors resolve, so it'll be free to read both of their values.

:::tip

It's important to call `warmSelectors` **before** trying to read any selector value with `selector.value`

:::
