---
title: Async watch
---

We can also use async function as watch reaction.

Example from previous chapter, but without selectors would look like:

```tsx
const weatherSettings = store({
  currentCity: 'New York',
  showLongDescription: true,
});

watch(async () => {
  const weatherData = await weatherApi(weatherSettings.currentCity);

  if (weatherSettings.showLongDescription) {
    console.log(`Current city weather is ${weatherData.longDescription}`);
  } else {
    console.log(`Current city weather is ${weatherData.shortDescription}`);
  }
});
```

Output to the console would work exactly the same way. It is recommended, however - to use selectors as their value can be reused between multiple reactions.

If we call such code twice

```ts
watch(async () => {
  const weatherData = await weatherApi(weatherSettings.currentCity);

  if (weatherSettings.showLongDescription) {
    console.log(`Current city weather is ${weatherData.longDescription}`);
  } else {
    console.log(`Current city weather is ${weatherData.shortDescription}`);
  }
});
watch(async () => {
  const weatherData = await weatherApi(weatherSettings.currentCity);

  if (weatherSettings.showLongDescription) {
    console.log(`Current city weather is ${weatherData.longDescription}`);
  } else {
    console.log(`Current city weather is ${weatherData.shortDescription}`);
  }
});
```

`weatherApi` would be called twice.

Using selector, however:

```tsx
const weatherSettings = store({
  currentCity: 'New York',
  showLongDescription: true,
});

const currentWeather = selector(async () => {
  const weatherData = await weatherApi(weatherSettings.currentCity);

  if (weatherSettings.showLongDescription) {
    return weatherData.longDescription;
  } else {
    return weatherData.shortDescription;
  }
});

watch(() => {
  console.log(`Current city weather is ${currentWeather.value.description}`);
});

watch(() => {
  console.log(`Current city weather is ${currentWeather.value.description}`);
});
```

Will require only one call to weather api.

---

Note that we can read from the store at any stage of the reaction

```tsx
watch(async () => {
  await someApi(store.foo);

  if (store.bar) {
    return;
  }

  const result = await anotherApi(store.xyz);

  console.log(result * anotherStore.someNumber);
});
```

By default - after each `await` phase - reaction will make sure that any store value it used previously didn't change.

If some value did change - reaction would cancel current run and start over.
