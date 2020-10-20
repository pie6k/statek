---
title: Concepts
---

The main concepts are:

### Store

Store is observable object created from any valid JavaScript object.

### Reaction

Reaction is a function that is supposed to be called in response to changes in store it was reading from during previous call

### Watching

Act of automatically or manually running reactions in response to store changes

### Selector

Entity that calculates some derieved data and allows reading it multiple times without triggering calculation again.

If selector reads from any store - it will automatically re-calculate it's value if used store value changes.

## React specific

### View

View is special kind of react component that will automatically re-render itself if any store value it used during the render changes
