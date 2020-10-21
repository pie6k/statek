---
title: Tutorial Intro
---

In this quick tutorial, we'll create Todo store and present various features of Statek using it.

We'll cover

- Creating simple store
- Using store values and reacting to changes in the store
- Creating selectors reducing amount of calculations
- Creating async selectors
- Creating async watching functions

At the end of the tutorial, we'll also cover other features and utilities, but outside of the context of Todo app.

### It'll cover both react and non-react use cases

In general rendering react components and calling non-react `watch` function we'll describe looks nearly identical.

Therefore, each section might include both react and non react examples in the same place, which will look like:

```tsx examples
//// React
// React code here
//// watch
// watch based code here
```

The tutorial will cover most of essential parts of the store, but all details and options are described in API Reference section.

Let's get started!
