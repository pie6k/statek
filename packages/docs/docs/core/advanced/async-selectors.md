---
title: Async selectors
---

Sometimes we need to get additional data in async way. Let's say each of our todos might have some comments, but we need to fetch those comments from external server.

Let's extend our store with `openedTodoId` property. We'll then fetch comments for opened todo.

```ts
const todos = store({
  list: [], // from previous examples,
  // ...all other props
  openedTodoId: null, // can be null or id of todo
});
```

Now, let's create selector family that can fetch comments for requested todo:

```ts
const todoComments = selectorFamily(async todoId => {
  const comments = await todoApi.getComments(todoId);
  return comments;
});
```

Now, let's create watch function that will log comments for opened todo.

```ts
watch(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  const commentsForOpenedTodo = todoComments(openedTodoId).value;

  console.log(
    `Count of comments for opened todo: ${commentsForOpenedTodo.length})`,
  );
});
```

Note that **even though our selector is async, we're reading its value in a sync way!**

This happens because each watching reaction will **suspend** (or stop) itslef when it faces selector that is not yet resolved. It'll then wait until all pending values are ready and then it'll run itself over again.

:::note

Even if selector is async, you can read its value sync-like inside watch or other selectors

:::

---

If we change our opened todo like

```ts
todos.openedTodoId = 1;
```

after a while we'll see output in the console:

```
Count of comments for opened todo: 2
```

We can then change opened todo again `todos.openedTodoId = 2` and again, after a while we'll see the output in the console.

If we'll, however, change `openedTodoId` back to `1`

```ts
todos.openedTodoId = 1;
```

We'll see output in the console instantly. This is because each selector is caching it's value as long as any store or other selector value it uses changes.

:::tip

Selector values are cached until any store value they used change.

:::

---

### Store changes wile async selector is pending

In the example we've seen previously:

```ts
const todoComments = selectorFamily(async todoId => {
  const comments = await todoApi.getComments(todoId);
  return comments;
});

watch(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  const commentsForOpenedTodo = todoComments(openedTodoId).value;

  console.log(
    `Count of comments for opened todo: ${commentsForOpenedTodo.length})`,
  );
});
```

You've maybe noticed that it's possible that `openedTodoId` will change while we're waiting for `todoApi` to resolve.

It would still work properly, because when watch reaction will run again **after** previously being suspended - it'll get new `openedTodoId` during the reaction, so it'll suspend again with new id.

Flow of such reaction will be like:

- `openedTodoId` is changed to `1`
- watch reaction detects it and runs itself
- it tries to read the value from selector for id `1`, but it is not ready yet so it suspends and waits for selector to resolve before running again.
- selector is fetching comments for todo `1`
- meanwhile, `openedTodoId` is changed to `2`
- selector has fetched comments for todo `1`, so watch reaction is running again
- it tries again to read comments from selector, but with id `2` this time. It means selector will cause watch reaction to suspend again.
- after it resolved, it'll once again restart watch reaction
- this time reaction can read the value, as it's ready in the selector, so reaction reaches its end and logs to the console.

All this means, that when watch reaction reaches its end, it is guaranteed that it's loggin value for current value of the state, without any outdated data.

The same principle works for any selector reading from other selector and so on.

## Async selector with multiple await phases

It is also possible that during some async selector, we'll use `await` multiple times.

Between each `await` **phase** it is possible that store values used previously changed.

Such case also properly handled

Considering such selector:

```ts
const someSelector = selectorFamily(async input => {
  const a = store.someValue;
  await api.getA(a);
  const b = store.otherValue;
  await api.getB(b);

  // etc...
});
```

After each phase, Statek will check if any of previously used store values changed. If it happens, it'll instantly stop current operation and start over.

:::note

Under the hook, such async function will throw `AsyncOperationCancelled` error to prevent function from continuing.

:::

Plase note that code like the one above is not recommended. It might be better to write instead:

```ts
const someSelector = selectorFamily(async input => {
  const { someValue, otherValue } = store.someValue;
  const [resultA, resultB] = await Promise.all(
    api.getA(someValue),
    api.getB(otherValue),
  );
});
```

But in some use-cases - it might be useful to conditionally execute async requests in sequence.

:::tip

If using multiple await phases inside selectors, it is recommended to read all sync data from stores at the beginning of the function, so selector call is cancelled as early as possible, if any of used store values are changed.

:::
