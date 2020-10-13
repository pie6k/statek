import { watch, store } from '@statek/core';

export type StoreCreator<T extends object> = T | (() => T);

function resolveThunk<T extends object>(thunk: StoreCreator<T>): T {
  if (typeof thunk === 'function') {
    return (thunk as () => T)();
  }

  return thunk as T;
}

export function storeSelector<V>(getter: () => V) {
  let value = getter();
  const valueStore = store({ value, stop: () => {} });
  const stop = watch(() => {
    valueStore.value = getter();
  });
  valueStore.stop = stop;

  return valueStore;
}

export function useStore() {}
