import {
  ReactionCallback,
  registerCurrentReactionHook,
  registerReaction,
} from '@statek/core';
import { updateClassComponentByFiber } from './classFiberUpdater';
import { isClassComponent } from './componentTypes';
import { Fiber, getCurrentFiber } from './fiber';
import { reactScheduler } from './scheduler';
import { useForceUpdateReaction } from './useForceUpdate';

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

export function useObserve() {
  const forceUpdateReaction = useForceUpdateReaction();

  // We can assert we're currently rendering in functional component, because otherwise above hook
  // would throw an error.
  const fiber = getCurrentFiber()!;

  fiberUpdatersMap.set(fiber, forceUpdateReaction);
}
