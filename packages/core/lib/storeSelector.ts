import { ReactionOptions } from './reaction';
import { store } from './store';
import { watch } from './watch';

export function storeSelector<V>(getter: () => V, options: ReactionOptions) {
  let value = getter();
  const valueStore = store({ value, stop: () => {} });
  const stop = watch(() => {
    valueStore.value = getter();
  }, options);

  valueStore.stop = stop;

  return valueStore;
}
