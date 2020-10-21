---
title: Async selectors
---

:::note

This section uses parts of the code created in previous tutorial parts.

:::

:::tip

Welcome to _advanced_ section of Statek docs 🚀!

:::

Sometimes we need to get additional data in async way. Let's say each of **our todos might have some comments, but we need to fetch those comments from external server.**

Let's extend our store with `openedTodoId` property. We'll then fetch comments for opened todo.

```ts
const todos = store({
  list: [], // from previous examples,
  // ...all other props
  openedTodoId: null, // can be null or id of todo
});
```

Now, let's create selector family that can fetch comments for requested todo id:

```ts
const todoComments = selectorFamily(async todoId => {
  const comments = await todoApi.getComments(todoId);
  return comments;
});
```

As our selector seems to be ready, and we have information about opened todo in the store, we can try to use the selector

```tsx examples
//// React
const OpenedTodoComments = view(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  const commentsForOpenedTodo = todoComments(openedTodoId).value;

  return (
    <div>Count of comments for opened todo: {commentsForOpenedTodo.length}</div>
  );
});

function App() {
  return (
    <Suspense fallback="Loading...">
      <OpenedTodoComments />
    </Suspense>
  );
}
//// watch
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

This happens because we're **suspending** reading values from selectors if they're not ready yet. It means we instantly stop current 'try', wait for selector to be ready and then try again.

:::note

Even if selector is async, you can read its value sync-like inside, watch or other selectors or react components

:::

:::note React note

Components reading from async selectors must be wrapped inside `Suspense` component.

:::

---

Having our code ready to read opened todo comments, if we change our opened todo

```ts
todos.openedTodoId = 1;
```

after a while we'll should see the output:

```
Count of comments for opened todo: 2
```

### Selectors are cached

Selectors cache their value when it is resolved. They will clear the cache if they use some value from any store and such value changes.

Let's change opened todo id to `2` and then back to `1`

We can then change opened todo `todos.openedTodoId = 2` after a while we'll see informations about the comments of `2` todo.

If we'll, however, change `openedTodoId` back to `1`

```ts
todos.openedTodoId = 1;
```

We'll see updated results instantly. This is because each selector is caching it's value as long as any store or other selector value it uses changes.

:::tip

Selector values are cached until any store value they used change.

:::

---

### Store changes while async selector is pending

In the example we've seen previously:

```ts
const todoComments = selectorFamily(async todoId => {
  const comments = await todoApi.getComments(todoId);
  return comments;
});
```

```tsx {2,8} examples
//// React
const OpenedTodoComments = view(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  const commentsForOpenedTodo = todoComments(openedTodoId).value;

  return (
    <div>Count of comments for opened todo: {commentsForOpenedTodo.length}</div>
  );
});

function App() {
  return (
    <Suspense fallback="Loading...">
      <OpenedTodoComments />
    </Suspense>
  );
}
//// watch
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

It would still work properly, because after **suspended** render or reaction call will run again - it'll get new `openedTodoId` value, so it'll suspend again with new id if needed.

Flow of such reaction or render will be like:

- `openedTodoId` is changed to `1`
- reaction/render tries to read the value from selector for id `1`, but it is not ready yet
  - it suspends and waits for selector to resolve before running again.
  - selector is fetching comments for todo `1`
- meanwhile, `openedTodoId` is changed to `2`
  - selector is still fetching comments for todo `1`
- selector has fetched comments for todo `1`, so our **suspended** watch reaction or render is restared
- it tries again to read comments from selector,
  - but now `openedTodoId` is `2`. It means selector will be called with new `id` so it'll suspend again.
- after it resolved, it'll once again restart reaction or render
- this time reaction can read the value, as it's ready in the selector, so reaction reaches its end outputs up-to-date result.

All this means, that when watch reaction or render reaches its end, it is guaranteed that it's output corresponds to current value of the state, without any outdated data.

The same principle works for selectors reading from other selectors and so on.

## Async selector with multiple await phases

It is also possible that during some async selector, we'll use `await` multiple times.

Between each `await` **phase** it is possible that store values used previously has changed.

Such case is also properly handled

Considering selector:

```ts
const someSelector = selectorFamily(async input => {
  const a = store.someValue;
  await api.getA(a);
  const b = store.otherValue;
  await api.getB(b);

  // etc...
});
```

After each await phase, Statek will check if any of previously used store values changed. If it happens, it'll instantly stop current operation and start over.

Plase note that code like the one above is not recommended. It might be better to write instead:

```ts {2,3}
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

:::tip

Under the hood, such async function will throw `AsyncOperationCancelled` error to prevent function from continuing. But you'll only need to handle this error when using `manualWatch` which is covered in next chapters.

:::

### Async selectors reading values from other async selectors.

If we have 2 async selectors or selector families and one of them is using the other one, read the value like below:

```ts {6}
const selA = selector(async () => {
  // await and return
});

const selB = selector(async () => {
  const valueFromSelectorA = await selA.promise;
  // await and return
});
```

Note we're reading the value like:

```ts
const valueFromSelectorA = await selA.promise;
```

instead of

```ts
const valueFromSelectorA = selA.value;
```

This is because we don't need **suspending** inside async functions.

:::caution

In async functions always use `await selector.promise` instead of `selector.value`.

Using `selector.value` inside async functions will throw an error.

:::
