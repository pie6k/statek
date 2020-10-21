---
title: Api - statek
sidebar_label: Statek
---

### batch

Will delay informing any reactions or components about write operations during the end of the call

```ts
batch(() => {
  // Reactions or components watching store.value will be delayed unitl the end of this callback
  store.value++;
  store.value++;
});
```

### dontWatch

Will not watch any read operations during provided callback

```ts
dontWatch(() => {
  // will not record read operations during this call
  performExpensiveOperation(store);
});
```

### sync

Will make any store changes performed during the call ignore schedulers of watch reactions, even if they have any

```ts
const myStore = store({ count: 1 });

watch(
  () => {
    console.log(myStore.count);
  },
  {
    scheduler: 'async',
  },
);

sync(() => {
  // Will be picked by above reaction ignoring async scheduler
  myStore.count++;
});
```

:::note

Read operations during sync call are still batched

:::

### syncEvery

Will flush each change to the store made during this callback instantly, ignoring any reactions schedulers

```ts
const myStore = store({ count: 1 });

watch(
  () => {
    console.log(myStore.count);
  },
  {
    scheduler: 'async',
  },
);

sync(() => {
  // Above reaction will be instantly called each time we change the value
  myStore.count++;
  // Above reaction will be instantly called each time we change the value
  myStore.count++;
});
```

### allowNestedWatch

Explicit flag required to call `watch` during another `watch` reaction. If trying to call `watch` inside another `watch` outside of this callback, error will be thrown

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

### createAsyncScheduler

Allows creating custom async scheduler. Useful if we want to wrap all reactions calls inside 3rd party callbacks such as React's batched updates.

:::note

By default, all reactions in `@statek/react` are batched and wrapped inside react batched updates so using it manually is not required.

:::

### selector

#### sync

Creates new selector (which does not accept any input arguments)

```ts
const myStore = store({ count: 1 });

const isBig = selector(() => myStore.count > 10);

isBig.value; // outputs false

watch(() => {
  // will be called only when isBig value changes between true and false
  console.log(isBig.value);
});
```

#### async

```ts
const myStore = store({ count: 1 });

const isBig = selector(async () => {
  return api.isNumberBig(myStore.count);
});

isBig.value; // if used outside of reaction or render - will throw selector promise

watch(() => {
  // will suspend until selector resolves and then call reaction again.
  console.log(isBig.value);
});

watch(async () => {
  // it is not allowed to read .value of async selector inside async reactions.
  // use selector.promise instead
  const result = await isBig.promise;
  console.log(result);
});
```

### selectorFamily

Creates new 'family' of selectors which can accept any amount of input arguments

```ts
const todos = store({
  list: [
    { id: 1, name: 'A', status: 'done', owner: 'Anna' },
    { id: 2, name: 'B', status: 'todo', owner: 'Tom' },
  ],
});

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

### warmSelectors

Will request all provided selectors to prepare their values if they're not ready yet.

If called during watch reaction or react component render, will also group any async selectors **suspense**'s into single one

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

```tsx {11} examples
//// React
import { warmSelectors } from 'statek';

const OpenedTodoInfo = view(() => {
  const { openedTodoId } = todos;

  if (!openedTodoId) {
    return;
  }

  // Both selectors will start fetching their values now and suspend if needed
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

### SelectorOptions

```ts
interface SelectorOptions {
  // Will change selector function name. Might be useful for debugging
  name?: string;
  // Decide whether or not selector should instantly start calculating it's value when created
  // Defaults to false
  lazy?: boolean;
  // Either 'silent' or 'reset' - will decide how async selectors will updat it's value
  // silent - will await new value while keeping old value and then swap them
  // reset - will remove existing value (causing all reactions using it to reset) and start calculating new one
  updateStrategy?: UpdateStrategy;
}
```

### UpdateStrategy

```ts
type UpdateStrategy = 'silent' | 'reset';
```

### getStoreRaw

Will return raw, not observable object corresponding to observable counterpart

```ts
const input = { count: 1 };

const myStore = store(input);

getStoreRaw(myStore) === input; // true
```

### isStore

Will return true if provided object is observable store

```ts
const myStore = store(input);

isStore(myStore); // true
```

### store

Will create new observable store or return existing one for provided input.

Input can be either object or function returning object

```ts
type StoreFactory<T extends object> = T | (() => T);

function store<T>(input: StoreFactory<T>): T;
```

### manualWatch

```ts
function manualWatch<A extends any[], R>(
  lazyWatcher: ManualReactionCallback<A, R>,
  onWatchedChange?: () => void,
  options?: ReactionOptions,
): ManualReaction<A, R>;

type ManualReaction<A extends any[], R> = ManualReactionCallback<A, R> & {
  stop(): void;
};

type ManualReactionCallback<A extends any[], R> = (...args: A) => R;
```

Will create reaction that can be manually called.

First argument is reaction callback that we can manually call.

2nd argument is callback that will be called each time when any store value used in last call changed

```ts
const callReaction = manualWatch(
  multiplier => {
    return myStore.count * multiplier;
  },
  () => {
    // change callback
    console.log('any store value used by reaction changed!');
  },
);

// We have to manually call the reaction for the first time
callReaction(2);
```

### watch

Will create new reaction that automatically calls itself each time store values used during last call is changed

```ts
function watch(
  watchCallback: ReactionCallback,
  options?: ReactionOptions,
): () => void;
```

```ts
const myStore = store({ count: 1 });

watch(() => {
  console.log(myStore.count);
});

// Changes will cause reaction to call itself again
myStore.count++;
myStore.count++;
myStore.count++;
```

### watchAllChanges

```ts
function watchAllChanges(
  storePart: object,
  callback: ReactionCallback,
  options?: ReactionOptions,
): () => void;
```

Requires 2 arguments. First is any store (any part of the store is store as well) and 2nd is callback that will be called every time **any** value of provided store changes

### ReactionOptions

```ts
interface ReactionOptions {
  // allows changing the moment reaction will be called after store values it uses are changed
  scheduler?: SchedulerInput;
  // Will be passed as 'this' argument during watch reaction call
  context?: any;
  // Debug helper
  name?: string;
  // Called every time any selector used during the reaction starts to silently update itself
  onSilentUpdate?: EventCallback<Promise<any>>;
}
```

### SchedulerInput

```ts
type SchedulerInput = 'sync' | 'async' | ReactionScheduler;
```

### SchedulerInput

```ts
type ReactionScheduler = (
  reaction: (),
) => Promise<void> | void;
```

### createAsyncScheduler

```ts
function createAsyncScheduler(
  wrapper?: (task: Task) => Promise<void> | void,
): ReactionScheduler;

type Task = () => void;
```

Allows creating custom async scheduler tha

```ts
import { unstable_batchedUpdates } from 'react-dom';

export const reactScheduler = createAsyncScheduler(task => {
  // will be called on next frame, calling task() will flush all pending reactions
  unstable_batchedUpdates(() => {
    task();
  });
});
```

### ReactionCallback

```ts
type ReactionCallback = () => void;
```

### ManualReactionCallback

```ts
type ManualReactionCallback<A extends any[], R> = (...args: A) => R;
```
