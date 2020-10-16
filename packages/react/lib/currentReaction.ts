import {
  allowInternal,
  InjectedReaction,
  ReadOperationInfo,
  addInjectReactionHook,
  registerReaction,
  injectReaction,
} from '@statek/core';
import { updateClassComponentByFiber } from './classFiberUpdater';
import { isClassComponent } from './componentTypes';
import { Fiber, getCurrentFiber, isFiberRunning, readContext } from './fiber';
import { reactScheduler } from './scheduler';
import { getComponentTypeNiceName, warnOnce } from './utils';
import { WatchedStoriesContext } from './WatchStore';

allowInternal(() => {
  addInjectReactionHook(getCurrentFiberUpdateReaction);
});

export const fiberUpdaterCache = new WeakMap<Fiber, () => void>();

export function getCurrentFiberUpdateReaction(
  readOperation: ReadOperationInfo,
): InjectedReaction | null {
  const fiber = getCurrentFiber();

  if (!fiber) {
    return null;
  }

  // Try to get either view updater or cached class updater
  const cachedUpdater = fiberUpdaterCache.get(fiber);

  // We're currently rendering view or have cached class updater.
  if (cachedUpdater) {
    return {
      reaction: cachedUpdater,
      getIsStillRunning: isFiberRunning.bind(null, fiber),
    };
  }

  // We're not in directly view.

  // Check if we're inside store observing context.

  const watchedStoriesContext = readContext(WatchedStoriesContext);

  // If we are - check if any of stories registered in this observing context is matching
  // target of current read operation.
  if (
    watchedStoriesContext &&
    watchedStoriesContext.stores.includes(readOperation.target)
  ) {
    // If so - register context provider re-render reaction as this access change reaction.
    return {
      reaction: watchedStoriesContext.forceUpdateReaction,
      getIsStillRunning: isFiberRunning.bind(null, fiber),
    };
  }

  // We're not in view and not inside matching access context.

  // The only case left where we can hook update is class component
  if (isClassComponent(fiber.type)) {
    // We're during class render and forceUpdate for this fiber is not yet cached.
    // Let's use forceUpdate of this class as reaction.
    const update = () => {
      updateClassComponentByFiber(fiber);
    };

    allowInternal(() => {
      registerReaction(update, update, { scheduler: reactScheduler });
    });

    // Save it in cache.
    fiberUpdaterCache.set(fiber, update);

    return {
      reaction: update,
      getIsStillRunning: isFiberRunning.bind(null, fiber),
    };
  }

  // Store is accessed during some component render, but we're not able to make it reactive

  if (process.env.NODE_ENV !== 'production') {
    warnAboutAccessToStoreInsideNonReactiveRender(fiber.type);
  }
  return null;
}

function warnAboutAccessToStoreInsideNonReactiveRender(componentType: any) {
  const niceName = getComponentTypeNiceName(componentType);
  warnOnce(
    componentType,
    `Accessing store property inside functional <${niceName} /> component that is not reactive. Either use useView hook inside of it or render <${niceName} /> inside <WatchStore /> provider.`,
  );
}
