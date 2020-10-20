import { store, StoreFactory, watchAllChanges } from 'statek';
import { useEffect, useMemo } from 'react';
import { useForceUpdate } from './utils/useForceUpdate';

export function useObservedState<T extends object>(input: StoreFactory<T>) {
  const forceUpdate = useForceUpdate();
  const localStore = useMemo(() => store(input), []);

  useEffect(() => {
    const stop = watchAllChanges(
      localStore,
      () => {
        forceUpdate();
      },
      {},
    );

    return stop;
  }, [localStore]);

  return localStore;
}
