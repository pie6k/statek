---
title: Selectors
---

:::note

This section uses parts of the code created in previous tutorial parts.

:::

## Selectors without arguments

Selectors allows us to perform some expensive calculations and reuse results multiple times.

Let's say we want to calculate count of finished todos on our list.

Without selectors, we could do something like:

```tsx examples
//// React
const CompletedTodosCount = view(() => {
  const completedTodos = todos.list.filter(todo => todo.status === 'done');

  return <div>Count of completed todos is {completedTodos.length}</div>;
});

//// watch

watch(() => {
  const completedTodos = todos.list.filter(todo => todo.status === 'done');

  console.log(`Count of completed todos is ${completedTodos.length}`);
});
```

This will work just fine, but it is possible that we'll want to use result of the same calculation in another place.

Let's say we want to get remainig todos as well.

```tsx examples
//// React
const RemainingTodosCount = view(() => {
  const completedTodos = todos.list.filter(todo => {
    return todo.status === 'done';
  }).length;

  const totalTodos = todos.list.length;

  const remainingTodos = totoalTodos - completedTodos;

  return <div>Count of remaining todos is {remainingTodos.length}</div>;
});
//// watch
watch(() => {
  const completedTodos = todos.list.filter(todo => {
    return todo.status === 'done';
  }).length;

  const totalTodos = todos.list.length;

  const remainingTodos = totoalTodos - completedTodos;

  console.log(`Count of remaining todos is ${remainingTodos}`);
});
```

As you might see, in both 2 above cases, we will compute list of completed tasks each time todo list is changed.

Let's try to solve this problem by introducing selector.

```ts
import { selector } from 'statek';

const completedTodosCount = selector(() => {
  return todos.list.filter(todo => todo.status === 'done').length;
});
```

And now use this selector value in 2 code examples we've written above:

```tsx examples
//// React
const CompletedTodosCount = view(() => {
  return <div>Count of completed todos is {completedTodosCount.value}</div>;
});
//// watch
watch(() => {
  console.log(`Count of completed todos is ${completedTodosCount.value}`);
});
```

and...

```tsx examples
//// React
const RemainingTodosCount = view(() => {
  return (
    <div>
      Count of remaining todos is{' '}
      {todos.list.length - completedTodosCount.value}
    </div>
  );
});
//// watch
watch(() => {
  const remainingTodos = todos.list.length - completedTodosCount.value;

  console.log(`Count of remaining todos is ${remainingTodos}`);
});
```

:::note

To read selector value, call `selector.value` instead of `selector`

:::

Our code got a lot shorter and also calculation of how many tasks are completed will always happen only once after todos list update.

:::tip

If selector reads any value from the store - it will automatically re-calculate it's value if such store value changes.

:::

## Selectors with arguments

Quite often we need to provide some additional input to the selector. **Selector families** are created for exactly this use case.

Let's create selector that returns todos by their status. Note now we'll return list of requested todos instead of count of them.

```ts
import { selectorFamily } from 'statek';

const todosByStatus = selectorFamily(status =>
  todos.list.filter(todo => todo.status === status),
);
```

Now, we can start using such selector family like:

```ts
todosByStatus('done').value.length; // will output count of finished tasks
```

:::note

Selectors are used the same way in `watch` reactions and `view` components

:::

Selectors are caching their values, so calling

```ts
todosByStatus('done').value.length;
todosByStatus('done').value.length;
```

Will trigger selector function to be called only once.

:::note

Selectors are caching their value until any store (or other selector) value they use changes.

:::

### Multiple arguments

Any selector family can accept multiple arguments

```ts
const todosForOwner = selectorFamily((owner, status) => {
  return todos.list.filter(todo => {
    return todo.owner === owner && todo.status === status;
  });
});

// Later on
todosForOwner('Anna', 'done').value;
```

### Combining selectors

In example above, we're again checking status of every single todo. Let's reuse selector we've created previously:

```ts
const todosForOwner = selectorFamily((owner, status) => {
  // get all todos with requested status from previous selector.
  const todosToCheck = todosByStatus(status).value;
  // filter for owner only those returned by selector
  return todosToCheck.filter(todo => {
    return todo.owner === owner && todo.status === status;
  });
});
```

---

### Note about arguments

:::note

Arguments passed to selectors must be serializable. You can pass any set of arguments that is JSON like - plain objects, arrays, primitives like strings, numbers etc.

:::

```ts
const someSelector = selectorFamily(callbackFunction => {
  // some calculations
});

someSelector(() => 'foo').value; // will throw an error!
```

Such selector is incorrect and will throw, when called with function as an argument.
