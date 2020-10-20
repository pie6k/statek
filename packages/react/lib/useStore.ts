import { useState } from 'react';
import { store, StoreFactory } from 'statek';

export function useStore<T extends object>(storeFactory: StoreFactory<T>): T {
  const [localStore] = useState(() => {
    return store(storeFactory);
  });

  return localStore;
}
