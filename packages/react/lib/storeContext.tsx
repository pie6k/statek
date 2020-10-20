import React, { createContext, ReactNode, useContext } from 'react';
import { useStore } from './useStore';

interface ProviderProps {
  children: ReactNode;
}

export function createStoreContext<T extends object>(factory: () => T) {
  const Context = createContext<T>(null as any);

  function useStoreFromContext(): T {
    const contextStore = useContext(Context)!;

    if (!contextStore) {
      throw new Error(
        'useStore can only be called inside corresponding store provider',
      );
    }

    return contextStore;
  }

  function Provider(props: ProviderProps) {
    const contextStore = useStore(factory);

    return (
      <Context.Provider value={contextStore}>{props.children}</Context.Provider>
    );
  }

  return [Provider, useStoreFromContext] as const;
}
