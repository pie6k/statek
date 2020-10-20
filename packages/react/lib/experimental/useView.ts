import { useForceUpdateReaction } from '../utils/useForceUpdate';
import { fiberUpdaterCache } from './currentReaction';
import { getCurrentFiber } from './fiber';
import { warnAboutExperimental } from './warn';

export function useView() {
  // warnAboutExperimental('useView');
  const forceUpdateReaction = useForceUpdateReaction();

  // @ts-ignore
  forceUpdateReaction.view = true;
  // We can assert we're currently rendering in functional component, because otherwise above hook
  // would throw an error.
  const fiber = getCurrentFiber()!;

  fiberUpdaterCache.set(fiber, forceUpdateReaction);
}

function noop() {}
