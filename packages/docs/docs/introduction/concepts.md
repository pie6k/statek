---
title: Concepts
---

The main concepts are:

### Store

Store is observable object created from any valid JavaScript object.

:::note

Any part of the store is also a store

:::

### Reaction

Reaction is a function that can use values from **store**.

It is supposed to be called again in response to changes in the store it was reading from during previous call.

### Watching

Act of automatically or manually running **reactions** in response to store changes

### Selector

Selectors allows us to perform some expensive calculations or async requests and reuse the results multiple times.

If selector reads from any **store** - it will automatically re-calculate it's value after related store values are changed

## React specific

### View

View is special kind of react component that will automatically re-render itself if any store value it used during the render changes

:::note

React re-render could also be called **reaction** if used in context of react & statek.

:::
