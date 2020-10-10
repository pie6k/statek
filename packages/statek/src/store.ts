import { observable } from './observable';

import { batchMethods } from './batch';
import { autoEffect } from './autoEffect';

export type StoreCreator<T extends object> = T | (() => T);

function resolveThunk<T extends object>(thunk: StoreCreator<T>): T {
  if (typeof thunk === 'function') {
    return (thunk as () => T)();
  }

  return thunk as T;
}

export function store<T extends object>(factory: StoreCreator<T>): T {
  const rawObject = resolveThunk(factory);

  const store = batchMethods(observable(rawObject));

  return store;
}

export function storeSelector<V>(getter: () => V) {
  let value = getter();
  const valueStore = store({ value, stop: () => {} });
  const [stop] = autoEffect(
    () => {
      valueStore.value = getter();
    },
    { syncScheduler: true },
  );
  valueStore.stop = stop;

  return valueStore;
}
