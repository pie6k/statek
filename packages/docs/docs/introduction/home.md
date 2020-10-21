---
title: Introduction

slug: /
---

Statek is easy-to-use state management library that connects advantages of reactive and declarative programming.

Main builting block is the store

```ts
import { store } from 'statek';

const todos = store({
  list: [
    { id: 1, name: 'A', status: 'done', owner: 'Anna' },
    { id: 2, name: 'B', status: 'todo', owner: 'Tom' },
  ],
});
```

That can be instantly used inside react components (views) and watch reactions

```tsx examples
//// React
const Todos = view(() => {
  return <div>Current todos count is {todos.list.length}</div>;
});
//// watch
import { watch } from 'statek';

watch(() => {
  console.log(`Current todos count is ${todos.list.length}`);
});
```

Each time used value changes in the store, reaction will run again or component will re-render.

#### Selectors

Selectors makes it possible to derieve some data from the store or provided input arguments and re-use it many times without selector being called again.

```ts
import { selectorFamily } from 'statek';

const todosByStatus = selectorFamily(status =>
  todos.list.filter(todo => todo.status === status),
);
```

```tsx examples
//// React
const TodosCountForStatus = view(({ status }) => {
  return <div>Current todos count is {todosByStatus(status).value.length}</div>;
});
//// watch
import { watch } from 'statek';

watch(() => {
  console.log(`You have ${todosByStatus('done').value.length} done tasks`);
});
```

#### Async selectors

It is also trivial to create async-selectors and read their output sync-like

```ts
const todos = store({
  list: [
    { id: 1, name: 'A', status: 'done', owner: 'Anna' },
    { id: 2, name: 'B', status: 'todo', owner: 'Tom' },
  ],
  openedTodoId: 1,
});

const todoComments = selectorFamily(async todoId => {
  const comments = await todoApi.getComments(todoId);
  return comments;
});
```

```tsx examples
//// React
const OpenedTodoComments = view(() => {
  return (
    <div>
      Opened todo has {todoComments(todos.openedTodoId).value.length} comments
    </div>
  );
});
//// watch
watch(() => {
  console.log(
    `Opened todo has ${todoComments(todos.openedTodoId).value.length} comments`,
  );
});
```
