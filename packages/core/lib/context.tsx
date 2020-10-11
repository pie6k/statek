import React, { createContext, ReactNode, useContext } from 'react';

export type StoreFactory = <T>(store: T) => T;

interface ProviderProps {
  children: ReactNode;
}

export function createContextStore<C extends () => any>(creator: C) {
  const Context = createContext<ReturnType<C>>(null as any);

  const useStore = ((() => {
    const contextStore = useContext(Context)!;

    if (!contextStore) {
      throw new Error('use context store outside of provider');
    }

    return contextStore;
  }) as any) as C;

  function Provider(props: ProviderProps) {
    const contextStore = creator();

    return (
      <Context.Provider value={contextStore}>{props.children}</Context.Provider>
    );
  }

  return [Provider, useStore] as const;
}
