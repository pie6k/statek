---
title: Selectors
---

## Selectors without arguments

Selectors allows us to calculate some dereived data that can be reused multiple times without calculating it again.

```ts
const productStore = store({ price: 10, name: 'Pizza' });
const isExpensive = selector(() => productStore.price > 20);
```

Our `isExpensive` selector output can be either `true` or `false`. It will automatically re-calculate it's value every time `productStore.price` is changed.

:::tip

If selector reads any value from the store - it will automatically re-calculate it's value if such store value changes.

:::

We can now use this selector value during watch reaction by calling `selector.value`.

Reaction using this selector will only be triggered again when selector output changes.

```ts
watch(() => {
  // reactin will run again every time product name changes
  const productName = productStore.name;
  // it will run again when selector value switches true <-> false
  if (isExpensive.value) {
    console.log(`${productName} is expensive`);
  } else {
    console.log(`${productName} is not expensive`);
  }
});
```

Now, if we change product price

```ts
productStore.price = 15;
```

Watch function **would not** be called again, as selector still returns the same value.

If we call it again

```ts
productStore.price = 25;
```

Watch reaction would be indeed calling again with the new values avaliable.

:::note

To read selector value, call `selector.value` instead of `selector`

:::

## Selectors with arguments

Selectors that accepts some additional input are called **Selector families**.

```ts
const isExpensive = selectorFamily(
  expensivePrice => productStore.price > expensivePrice,
);
```

Now, we can use such selector like

```ts
isExpensive(30).value; // will output false
isExpensive(20).value; // will output true
```

Selectors are caching their values, so calling

```ts
isExpensive(30).value;
isExpensive(30).value;
```

Will trigger selector function to be called only once.

:::note

Selectors are caching their value until any store (or other selector) value they use changes.

:::

### Multiple arguments

Any selector family can accept multiple arguments

```ts
const isExpensive = selectorFamily((price, category, expensesInThisMonth) => {
  return price > 30 && category === 'food' && expensesInThisMonth < 200;
});

// Later on
isExpensive(30, 'food', 150).value;
```

:::caution

Arguments passed to selectors must be serializable. You can pass any set of arguments that is JSON like - plain objects, arrays, primitives like strings, numbers etc.

:::

```ts
const someSelector = selectorFamily(callbackFunction => {
  // some calculations
});

someSelector(() => 'foo').value; // will throw an error!
```

Such selector is incorrect and will throw, when called with function as an argument.
