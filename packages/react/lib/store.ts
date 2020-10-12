import { watch, observable } from '@statek/core';

export type StoreCreator<T extends object> = T | (() => T);

function resolveThunk<T extends object>(thunk: StoreCreator<T>): T {
  if (typeof thunk === 'function') {
    return (thunk as () => T)();
  }

  return thunk as T;
}

export function createStore<T extends object>(factory: StoreCreator<T>): T {
  const rawObject = resolveThunk(factory);

  const store = observable(rawObject);

  return store;
}

export function storeSelector<V>(getter: () => V) {
  let value = getter();
  const valueStore = createStore({ value, stop: () => {} });
  const stop = watch(() => {
    valueStore.value = getter();
  });
  valueStore.stop = stop;

  return valueStore;
}
