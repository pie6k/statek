import { Fiber, getCurrentFiber } from './fiber';
import { useForceUpdateReaction } from './useForceUpdate';

// registerCurrentReactionHook(getCurrentFiberUpdateReaction);

export const fiberViewsUpdaters = new WeakMap<Fiber, () => void>();

export function updateViewByFiber(fiber: Fiber) {
  const hookBasedUpdater = fiberViewsUpdaters.get(fiber);

  if (hookBasedUpdater) {
    hookBasedUpdater();
    return;
  }
}

export function useView() {
  const forceUpdateReaction = useForceUpdateReaction();

  // We can assert we're currently rendering in functional component, because otherwise above hook
  // would throw an error.
  const fiber = getCurrentFiber()!;

  fiberViewsUpdaters.set(fiber, forceUpdateReaction);
}

function noop() {}
