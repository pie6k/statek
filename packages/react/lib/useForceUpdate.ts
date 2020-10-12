import { ReactionCallback, registerReaction } from '@statek/core';
import { useMemo, useReducer } from 'react';
import { reactScheduler } from './scheduler';

const updateReducer = (num: number): number => (num + 1) % 1_000_000;

export function useForceUpdate(): () => void {
  const [, update] = useReducer(updateReducer, 0);
  return update as () => void;
}

export function useForceUpdateReaction(): ReactionCallback {
  const forceUpdate = useForceUpdate();

  useMemo(() => {
    registerReaction(forceUpdate, forceUpdate, { scheduler: reactScheduler });
  }, [forceUpdate]);

  return forceUpdate;
}
