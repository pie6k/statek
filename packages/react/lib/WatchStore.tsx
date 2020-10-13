import React, { createContext, ReactNode } from 'react';

interface Props {
  stores: () => object | object[];
  children: ReactNode;
}

const WatchedStoriesContext = createContext<object[]>([]);

export function WatchStore({ children, stores }: Props) {
  return (
    <WatchedStoriesContext.Provider value={[]}>
      {children}
    </WatchedStoriesContext.Provider>
  );
}
