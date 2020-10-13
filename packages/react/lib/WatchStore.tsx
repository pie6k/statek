import React, { createContext, ReactNode } from 'react';
import {
  selectInStore,
  isStore,
  ReactionCallback,
  getStoreRaw,
} from '@statek/core';
import { useForceUpdateReaction } from './useForceUpdate';

type StoresSelector = () => object | object[];

function resolveStoresSelector(selector: StoresSelector): object[] {
  const storeOrStores = selectInStore(selector);

  let storesArray: object[] = [];

  if (Array.isArray(storeOrStores)) {
    storesArray = storeOrStores as object[];
  }

  storesArray = [storeOrStores];

  return storesArray.map(store => {
    if (!isStore(store)) {
      throw new Error('Some of selected objects is not observable');
    }

    // return store;

    return getStoreRaw(store);
  });
}

interface Props {
  stores: () => object | object[];
  children: ReactNode;
}

interface WatchedStoresContextData {
  stores: object[];
  forceUpdateReaction: ReactionCallback;
}

export const WatchedStoriesContext = createContext<WatchedStoresContextData | null>(
  null,
);

export function WatchStore({ children, stores }: Props) {
  const storesArray = resolveStoresSelector(stores);

  const forceUpdateReaction = useForceUpdateReaction();

  return (
    <WatchedStoriesContext.Provider
      value={{ stores: storesArray, forceUpdateReaction }}
    >
      {children}
    </WatchedStoriesContext.Provider>
  );
}
