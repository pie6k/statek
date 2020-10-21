---
title: Api - @statek/react
sidebar_label: Statek - React
---

Quite often it might happen that we want to read value from 2 or more async selectors 'at once'.

For example, we might need both comments and attachments for our opened todo.

In such case, we'll have 2 async selectors

```ts {6-9}
const todoComments = selectorFamily(async todoId => {
  const comments = await todoApi.getComments(todoId);
  return comments;
});

const todoAttachments = selectorFamily(async todoId => {
  const attachments = await todoApi.getAttachments(todoId);
  return attachments;
});
```

Now, you might want to use them both at the same time:

```tsx {9} examples
//// React
const TodoInfo = view(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  const comments = todoComments(openedTodoId).value;
  const attachments = todoAttachments(openedTodoId).value;

  return (
    <div>
      We have ${comments.length}) comments and ${attachments.length} attachments
    </div>
  );
});
//// watch
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

This, however - will make such reaction or render to **suspend** twice. First, when it tries to read comments, and then **after** comments selector resolves, when it tries to read attachments.

We might want to avoid that and somehow start requesting both values in parrell.

This is when `warmSelectors` function comes in handy.

We can modify our code:

```tsx {11} examples
//// React
import { warmSelectors } from 'statek';

const OpenedTodoInfo = view(() => {
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

  return (
    <div>
      We have ${comments.length}) comments and ${attachments.length} attachments
    </div>
  );
});
//// watch
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

This way, we let both selectors know that their value is requested **before** we actually try to read it so it'll need to suspend.

This way reaction/render will **suspend** only once.

- When it tries to read comments data - it'll suspend,
- but as we warmed attachments selector as well already, it knows it needs to wait for it as well before trying again.
- suspended reaction/render again will be restarted when **both** comments and attachments are ready

:::tip

It's important to call `warmSelectors` **before** trying to read any selector value with `selector.value`

:::

:::tip

We **warm** ☀️ selectors, not **warN**

:::
