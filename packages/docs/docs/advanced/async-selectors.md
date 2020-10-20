---
title: Async selectors
---

Any selector can be based on async function.

Even if they're async, accessing their `.value` will return sync value.

```ts
const weatherSettings = store({ currentCity: 'New York' });

const weatherData = selectorFamily(async cityName => {
  // Selector is async!
  const weatherData = await weatherApi(cityName);
});

watch(() => {
  const cityName = weatherSettings.currentCity;
  // We don't need await to read value of the selector!
  const weatherData = weatherData(weatherSettings.currentCity).value;
  console.log(`Current city weather is ${weatherData.description}`);
});
```

:::note

Even if selector is async, you can read it's value sync-like inside watch or other selectors

:::

### Reaction suspending

If async selector is called while selector value is not ready yet, it's execution will be **suspended**. It means it'll wait for selector to be ready, and then it'll run itself again.

Above example would output

```
Current city weather is windy
```

When `currentWeather` selector resolves.

If we call

```ts
weatherSettings.currentCity = 'Warsaw';
```

after a while, we'd see

```
Current city weather is windy
```

in the console.

If we switch city back to New York. As selector calculated value for 'New York' before, it'll resolve instantly.

```ts
weatherSettings.currentCity = 'New York';
```

:::tip

Selector values are cached until any store value they used change.

:::

---

### Reading from the store during async function

Async selector can read from the store at any stage of it's async function without any additional code.

First, let's consider selector that has only one 'await' inside of it.

```ts
const weatherSettings = store({
  currentCity: 'New York',
  formatRainInfo: true,
});

const currentWeather = selectorFamily(async cityName => {
  // We read some data from the store.
  const formatRainInfo = weatherSettings.formatRainInfo;
  // Now we await external api call. Note that .formatRainInfo could change while we're waiting!
  const weatherData = await weatherApi(weatherSettings.currentCity);

  // If .formatRainInfo has changed while we were waiting this call will be instantly cancelled
  // and following code will not be executed.

  // Instead, selector will run itself again from the start.
  const shouldShowLongDescription = weatherSettings.showLongDescription;

  return formatWeatherData(weatherData, formatRainInfo);
});
```

:::tip

If using multiple await phases inside selectors, it is recommended to read all sync data from stores at the beginning of the function, so selector call is cancelled as early as possible, if any of used store values are changed.

:::

In example above, if `weatherSettings.showLongDescription` changes while selector value is resolving, it will cancel current attempt to calculate it's value and start again.

Therefore, such reaction

```tsx
watch(() => {
  console.log(`Current city weather is ${currentWeather.value.description}`);
});
```

Would output to the console only when selector value successfully resolved. It guarantees that the output corresponds to the current state of the store.
