import {
  ReactionCallback,
  registerCurrentReactionHook,
  registerReaction,
  watchSelected,
} from '@statek/core';
import { useEffect, useMemo, useRef } from 'react';
import { updateClassComponentByFiber } from './classFiberUpdater';
import { isClassComponent } from './componentTypes';
import { Fiber, getCurrentFiber } from './fiber';
import { reactScheduler } from './scheduler';
import { useForceUpdateReaction, useForceUpdate } from './useForceUpdate';

registerCurrentReactionHook(getCurrentFiberUpdateReaction);

export const fiberUpdatersMap = new WeakMap<Fiber, () => void>();

export function updateFiber(fiber: Fiber) {
  const hookBasedUpdater = fiberUpdatersMap.get(fiber);

  if (hookBasedUpdater) {
    hookBasedUpdater();
    return;
  }
}

export function getCurrentFiberUpdateReaction(): ReactionCallback | null {
  const fiber = getCurrentFiber();

  if (!fiber) {
    return null;
  }

  const updater = fiberUpdatersMap.get(fiber);

  if (updater) {
    return updater;
  }

  if (!isClassComponent(fiber.type)) {
    return null;
  }

  const update = () => {
    updateClassComponentByFiber(fiber);
  };

  registerReaction(update, update, { scheduler: reactScheduler });

  fiberUpdatersMap.set(fiber, update);

  return update;
}

export function useView() {
  const forceUpdateReaction = useForceUpdateReaction();

  // We can assert we're currently rendering in functional component, because otherwise above hook
  // would throw an error.
  const fiber = getCurrentFiber()!;

  fiberUpdatersMap.set(fiber, forceUpdateReaction);
}

function noop() {}

export function useUpdateOnStoreChanges<T extends object>(
  storeGetter: () => T,
) {
  const forceUpdate = useForceUpdate();

  const stopRef = useRef<() => void>(noop);

  useMemo(() => {
    stopRef.current?.();
    // We cannot create same reaction twice, so let's wrap force update in fresh function.
    function forceUpdateCallback() {
      forceUpdate();
    }
    stopRef.current = watchSelected(storeGetter, forceUpdateCallback, {
      scheduler: reactScheduler,
    });
  }, [storeGetter]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);
}
