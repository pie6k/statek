import { getCurrentFiber, Fiber } from './fiber';
import { useForceUpdate } from './useForceUpdate';

export const fiberUpdatersMap = new WeakMap<Fiber, () => void>();

export function getCurrentFiberUpdater() {
  const fiber = getCurrentFiber();

  if (!fiber) {
    return null;
  }

  const updater = fiberUpdatersMap.get(fiber);

  if (updater) {
    return updater;
  }

  return null;
}

export function useObserve() {
  const forceUpdate = useForceUpdate();

  // We can assert we're currently rendering in functional component, because otherwise above hook
  // would throw an error.
  const fiber = getCurrentFiber()!;

  fiberUpdatersMap.set(fiber, forceUpdate);
}
