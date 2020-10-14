import {
  ReactionCallback,
  registerGetCurrentReactionHook,
  registerReaction,
  ReadOperationInfo,
  isStore,
  allowPublicInternal,
} from '@statek/core';
import { updateClassComponentByFiber } from './classFiberUpdater';
import { isClassComponent } from './componentTypes';
import { getCurrentFiber, readContext } from './fiber';
import { reactScheduler } from './scheduler';
import { fiberViewsUpdaters } from './useView';
import { getComponentTypeNiceName, warnOnce } from './utils';
import { WatchStore, WatchedStoriesContext } from './WatchStore';

allowPublicInternal(() => {
  registerGetCurrentReactionHook(getCurrentFiberUpdateReaction);
});

export function getCurrentFiberUpdateReaction(
  readOperation: ReadOperationInfo,
): ReactionCallback | null {
  const fiber = getCurrentFiber();

  if (!fiber) {
    return null;
  }

  // Try to get either view updater or cached class updater
  const viewUpdater = fiberViewsUpdaters.get(fiber);

  // We're currently rendering view or have cached class updater.
  if (viewUpdater) {
    return viewUpdater;
  }

  // We're not in view.

  // Check if we're inside store observing context.

  const watchedStoriesContext = readContext(WatchedStoriesContext);

  // If we are - check if any of stories registered in this observing context is matching
  // target of current read operation.
  if (
    watchedStoriesContext &&
    watchedStoriesContext.stores.includes(readOperation.target)
  ) {
    // If so - register context provider re-render reaction as this access change reaction.
    return watchedStoriesContext.forceUpdateReaction;
  }

  // We're not in view and not inside matching access context.

  // We're during class render and forceUpdate for this fiber is not yet cached.
  // Let's use forceUpdate of this class as reaction.
  if (isClassComponent(fiber.type)) {
    const update = () => {
      updateClassComponentByFiber(fiber);
    };

    allowPublicInternal(() => {
      registerReaction(update, update, { scheduler: reactScheduler });
    });

    // Save it in cache.
    fiberViewsUpdaters.set(fiber, update);

    return update;
  }

  // TODO - only in dev
  warnAboutAccessToStoreInsideNonReactiveRender(fiber.type);
  return null;
}

function warnAboutAccessToStoreInsideNonReactiveRender(componentType: any) {
  const niceName = getComponentTypeNiceName(componentType);
  warnOnce(
    componentType,
    `Accessing store property inside functional <${niceName} /> component that is not reactive. Either use useView hook inside of it or render <${niceName} /> inside <WatchStore /> provider.`,
  );
}
