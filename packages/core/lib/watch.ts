import {
  assertNoPendingPhaseAfterReactionFinished,
  cancelPendingPhasesIfNeeded,
  injectReactivePromiseThen,
  isAsyncReaction,
  isAsyncReactionCancelledError,
  markReactionAsAsync,
} from './async/promiseWrapper';
import { allowNestedWatchManager } from './batch';
import { allowInternal } from './internal';
import {
  getCallbackWrapperReaction,
  isReaction,
  isReactionErased,
  ManualReactionCallback,
  ReactionCallback,
  ReactionOptions,
  registerLazyReactionCallback,
  registerReaction,
  resetReaction,
  eraseReaction,
} from './reaction';
import { callWithReactionsStack, getRunningReaction } from './reactionsStack';
import { isResourcePromise } from './resource';
import { isStore, registerSelectedAnyChangeReaction } from './store';
import { callWithSuspense } from './suspense';

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

  if (existingReaction && !isReactionErased(existingReaction)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `You're calling watch on callback that is already running. It will have no effect.`,
      );
    }

    return function unsubscribe() {
      eraseReaction(existingReaction);
    };
  }

  // This reaction exists, but was stopped. Reset it and start it again.
  if (existingReaction) {
    resetReaction(existingReaction);
    callWithReactionsStack(existingReaction, watchCallback);

    return function unsubscribe() {
      eraseReaction(existingReaction);
    };
  }

  // New reaction

  function reactionCallback() {
    if (isAsyncReaction(reactionCallback)) {
      cancelPendingPhasesIfNeeded(reactionCallback);
    }

    const callbackResult = callWithSuspense(() => {
      return callWithReactionsStack(reactionCallback, watchCallback);
    }, reactionCallback);

    if (callbackResult instanceof Promise) {
      markReactionAsAsync(reactionCallback);

      callbackResult
        .then(() => {
          assertNoPendingPhaseAfterReactionFinished(reactionCallback);
        })
        .catch(error => {
          if (isAsyncReactionCancelledError(error)) {
            // This is expected.
            return;
          }

          console.warn('Watch async function thrown an error', error);

          if (isResourcePromise(error)) {
            console.warn(
              `Sems you're calling async selector 'read' inside async watch function. Use .read only inside sync functions. In async functions, call 'selector.promise' instead.`,
            );
            return;
          }
        });
    }
  }

  allowInternal(() => {
    registerReaction(reactionCallback, watchCallback, options);
  });

  reactionCallback();

  function stop() {
    eraseReaction(reactionCallback);
  }

  return stop;
}

export function watchAllChanges(
  storePart: object,
  callback: ReactionCallback,
  options: ReactionOptions = {},
) {
  injectReactivePromiseThen();
  if (options.name) {
    options.name = 'watchSelected';
  }

  if (!isStore(storePart)) {
    throw new Error('watchSelected input must be any part of the store');
  }

  if (isReaction(callback)) {
    throw new Error(
      `Cannot call watchSelected multiple times with the same callback.`,
    );
  }

  allowInternal(() => {
    registerReaction(callback, callback, options);
  });

  const stop = registerSelectedAnyChangeReaction(storePart, callback);

  return stop;
}

export type ManualReaction<A extends any[], R> = ManualReactionCallback<
  A,
  R
> & {
  stop(): void;
};

const noop = () => {};

export function manualWatch<A extends any[], R>(
  lazyWatcher: ManualReactionCallback<A, R>,
  onWatchedChange: () => void = noop,
  options: ReactionOptions = {},
): ManualReaction<A, R> {
  injectReactivePromiseThen();
  if (!options.name) {
    options.name = 'manualWatch';
  }
  function reactionCallback(...args: A): R {
    if (isReactionErased(reactionCallback)) {
      throw new Error(
        `Cannot call lazyWatch callback after it has unsubscribed`,
      );
    }

    const result = callWithSuspense(
      (...args: A) => {
        return callWithReactionsStack(reactionCallback, lazyWatcher, ...args);
      },
      reactionCallback,
      ...args,
    );

    return result;
  }

  allowInternal(() => {
    registerReaction(reactionCallback, lazyWatcher, options);
    registerLazyReactionCallback(reactionCallback, onWatchedChange);
  });

  function stop() {
    eraseReaction(reactionCallback);
  }

  reactionCallback.stop = stop;

  return reactionCallback;
}
