import { Fiber, getCurrentFiber, isFiberRunning } from './fiber';
import { allowInternal, injectReaction } from '@statek/core';
import { useForceUpdateReaction } from './useForceUpdate';
import { fiberUpdaterCache } from './currentReaction';

// registerCurrentReactionHook(getCurrentFiberUpdateReaction);

export function useView() {
  const forceUpdateReaction = useForceUpdateReaction();

  // @ts-ignore
  forceUpdateReaction.view = true;
  // We can assert we're currently rendering in functional component, because otherwise above hook
  // would throw an error.
  const fiber = getCurrentFiber()!;

  fiberUpdaterCache.set(fiber, forceUpdateReaction);
}

function noop() {}
