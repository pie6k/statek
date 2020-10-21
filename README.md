<p align="center">
  <img width="240"  src="logo.png">
</p>

<p align="center">
  Statek - Delightful state management library
</p>

---

[Statek website](https://statek.dev)

[Docs](https://statek.dev/docs)

[Api Reference](https://statek.dev/docs/api)

---

### Declarative data

Statek connects reactive data reactions with declarative style of expressing desired results inspired by react.

### Read asyns data using sync functions

It is possible to read async selectors data in sync-like way inside store reactions and react components

### No boilerplate

It is nearly trivial to start working with statek. Data store created with statek works like plain js-object.

### Non-react suspense mode

Inspired by react suspense - the same thing is possible inside store change reactions, allowing easy access to async data

### Works with or without React

Most of the concepts of Statek works nearly identical inside or outside of react world.

### Data (async) selectors

Use selectors to perform expensive calculations or async requestes and reuse results multiple times.

---

## Code examples

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

```tsx
// React
import { view } from '@statek/react';
const Todos = view(() => {
  return <div>Current todos count is {todos.list.length}</div>;
});
```

```tsx
// watch
import { watch } from 'statek';

watch(() => {
  console.log(`Current todos count is ${todos.list.length}`);
});
```

Each time used value changes in the store, reaction will run again or component will re-render.

### Selectors

Selectors makes it possible to derieve some data from the store or provided input arguments and re-use it many times without selector being called again.

```ts
import { selectorFamily } from 'statek';

const todosByStatus = selectorFamily(status =>
  todos.list.filter(todo => todo.status === status),
);
```

```tsx examples
// React
const TodosCountForStatus = view(({ status }) => {
  return <div>Current todos count is {todosByStatus(status).value.length}</div>;
});

// watch
import { watch } from 'statek';

watch(() => {
  console.log(`You have ${todosByStatus('done').value.length} done tasks`);
});
```

### Async selectors

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

---

### Licence

The MIT License (MIT)

Copyright (c) 2015-present Dan Abramov

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
