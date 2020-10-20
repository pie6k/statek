---
title: Introduction
slug: /react
---

This section of docs covers react binding of Statek library.

:::info Read core docs first

Most of the concepts of statek core integrates smoothly with React. If you havent read statek core tutorial, it is highly recommended.

In this doc, I'll be using terms from core docs such as `store`, `selector` etc.

:::

Before we'll move forward, here are some brief things about how statek integrates with React.

- all reactive components are wrapped with `view` and are called 'views'
- all views automatically re-renders on store values they used updates
- all async selectors can be used in sync way inside views thanks to suspense

### Installation

To install the latest stable version of Statek React binding, run the following command:

```bash npm2yarn
npm install --save statek @statek/react
```

It'll install both `@statek/react` and `statek` library itself.
