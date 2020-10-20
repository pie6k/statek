import React, { createContext, ReactNode, useMemo } from 'react';
import { getStoreRaw, isStore, ReactionCallback, assertStore } from 'statek';
import { convertMaybeArrayToArra, useArrayMemo } from '../utils/array';
import { useForceUpdateReaction } from '../utils/useForceUpdate';
import { warnAboutExperimental } from './warn';

function assertValidStoresInput(stores: object[]) {
  return stores.forEach(store => {
    if (!isStore(store)) {
      throw new Error('Some of selected objects is not observable');
    }
  });
}

type StoresInput = object | object[];

interface Props {
  stores: StoresInput;
  children: ReactNode;
}

interface WatchedStoresContextData {
  stores: object[];
  forceUpdateReaction: ReactionCallback;
}

export const WatchContextRaw = createContext<WatchedStoresContextData | null>(
  null,
);

export function WatchContext({ children, stores }: Props) {
  if (!Array.isArray(stores)) {
    throw new Error(`WatchContext stores prop must be an array`);
  }

  const forceUpdateReaction = useForceUpdateReaction();

  const storeTargets = stores.map(store => {
    assertStore(
      store,
      `All objects provided to WatchContext stores prop must be stores.`,
    );
    return getStoreRaw(store);
  });

  return (
    <WatchContextRaw.Provider
      // We intentionally don't memo context value to make sure content is re-rendering every time
      // update is requested.
      value={{ forceUpdateReaction, stores: storeTargets }}
    >
      {children}
    </WatchContextRaw.Provider>
  );
}
