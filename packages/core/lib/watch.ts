import { registerSelectedAnyChangeReaction } from './store';
import {
  cleanReactionReadData,
  getCallbackWrapperReaction,
  ReactionCallback,
  ReactionOptions,
  registerReaction,
  stopReaction,
  LazyReactionCallback,
  registerLazyReactionCallback,
  resetReaction,
  isReactionStopped,
  isReaction,
} from './reaction';
import { callWithReactionsStack, getRunningReaction } from './reactionsStack';
import { selectInStore, allowNestedWatchManager } from './batch';
import { allowInternal } from './internal';
import { callWithSuspense } from './suspense';
import { injectReactivePromiseThen } from './promiseWrapper';

export function watch(
  watchCallback: ReactionCallback,
  options: ReactionOptions = {},
): () => void {
  injectReactivePromiseThen();
  if (!options.name) {
    options.name = 'watch';
  }

  if (getRunningReaction() && !allowNestedWatchManager.isRunning()) {
    throw new Error(
      'Cannot start nested watch without explicit call to allowNestedWatch. If you want to start watching inside other reaction, call it like `allowNestedWatch(() => { watch(callback) })`. Remember to stop nested watching when needed to avoid memory leaks.',
    );
  }
  const existingReaction = getCallbackWrapperReaction(watchCallback);

  if (existingReaction && !isReactionStopped(existingReaction)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `You're calling watch on callback that is already running. It will have no effect.`,
      );
    }

    return function unsubscribe() {
      stopReaction(existingReaction);
    };
  }

  // This reaction exists, but was stopped. Reset it and start it again.
  if (existingReaction) {
    resetReaction(existingReaction);
    callWithReactionsStack(existingReaction, watchCallback);

    return function unsubscribe() {
      stopReaction(existingReaction);
    };
  }

  // New reaction

  function reactionCallback() {
    callWithSuspense(() => {
      return callWithReactionsStack(reactionCallback, watchCallback);
    }, reactionCallback);
  }

  allowInternal(() => {
    registerReaction(reactionCallback, watchCallback, options);
  });

  reactionCallback();

  function stop() {
    stopReaction(reactionCallback);
  }

  return stop;
}

export function watchSelected(
  selector: () => object,
  callback: ReactionCallback,
  options: ReactionOptions = {},
) {
  injectReactivePromiseThen();
  if (options.name) {
    options.name = 'watchSelected';
  }
  const resolvedObservable = selectInStore(selector);

  if (isReaction(callback)) {
    throw new Error(
      `Cannot call watchSelected multiple times with the same callback.`,
    );
  }

  allowInternal(() => {
    registerReaction(callback, callback, options);
  });
  const stop = registerSelectedAnyChangeReaction(resolvedObservable, callback);

  return stop;
}

export type LazyReaction<A extends any[], R> = LazyReactionCallback<A, R> & {
  stop(): void;
};

const noop = () => {};

export function manualWatch<A extends any[], R>(
  lazyWatcher: LazyReactionCallback<A, R>,
  onWatchedChange: () => void = noop,
  options: ReactionOptions = {},
): LazyReaction<A, R> {
  injectReactivePromiseThen();
  if (options.name) {
    options.name = 'manualWatch';
  }
  function reactionCallback(...args: A): R {
    if (isReactionStopped(reactionCallback)) {
      throw new Error(
        `Cannot call lazyWatch callback after it has unsubscribed`,
      );
    }

    // return callWithReactionsStack(reactionCallback, lazyWatcher, ...args);
    return callWithSuspense(
      (...args: A) => {
        return callWithReactionsStack(reactionCallback, lazyWatcher, ...args);
      },
      reactionCallback,
      ...args,
    );
  }

  allowInternal(() => {
    registerReaction(reactionCallback, lazyWatcher, options);
  });

  registerLazyReactionCallback(reactionCallback, onWatchedChange);

  function stop() {
    stopReaction(reactionCallback);
  }

  reactionCallback.stop = stop;

  return reactionCallback;
}
