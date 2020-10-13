import {
  getSelectedAnyChangeReactions,
  registerSelectedAnyChangeReaction,
} from './observable';
import {
  cleanReactionReadData,
  hasCallbackReaction,
  ReactionCallback,
  ReactionOptions,
  registerReaction,
  unsubscribedReactions,
  LazyReactionCallback,
  callbacksReactions,
  registerLazyReactionCallback,
} from './reaction';
import { callWithReactionsStack } from './reactionsStack';
import { selectInStore } from './batch';

export function watch(
  watcher: ReactionCallback,
  options: ReactionOptions = {},
): () => void {
  if (hasCallbackReaction(watcher)) {
    return function unsubscribe() {
      cleanReactionReadData(watcher);
      unsubscribedReactions.add(reactionCallback);
    };
  }
  function reactionCallback() {
    return callWithReactionsStack(reactionCallback, watcher);
  }

  registerReaction(reactionCallback, watcher, options);

  unsubscribedReactions.delete(reactionCallback);

  reactionCallback();

  function unsubscribe() {
    cleanReactionReadData(reactionCallback);
    unsubscribedReactions.add(reactionCallback);
    callbacksReactions.delete(watcher);
  }

  return unsubscribe;
}

export function watchSelected(
  selector: () => object,
  callback: ReactionCallback,
  options?: ReactionOptions,
) {
  const resolvedObservable = selectInStore(selector);
  registerReaction(callback, callback, options);
  const stop = registerSelectedAnyChangeReaction(resolvedObservable, callback);

  return stop;
}

export type LazyReaction<A extends any[], R> = LazyReactionCallback<A, R> & {
  unsubscribe(): void;
};

const noop = () => {};

export function lazyWatch<A extends any[], R>(
  lazyWatcher: LazyReactionCallback<A, R>,
  onWatchedChange: () => void = noop,
  options?: ReactionOptions,
): LazyReaction<A, R> {
  function reactionCallback(...args: A): R {
    if (unsubscribedReactions.has(reactionCallback)) {
      throw new Error(
        `Cannot call lazyWatch callback after it has unsubscribed`,
      );
    }
    return callWithReactionsStack(reactionCallback, lazyWatcher, ...args);
  }

  registerReaction(reactionCallback, lazyWatcher, options);

  registerLazyReactionCallback(reactionCallback, onWatchedChange);

  unsubscribedReactions.delete(reactionCallback);

  function unsubscribe() {
    cleanReactionReadData(reactionCallback);
    unsubscribedReactions.add(reactionCallback);
  }

  reactionCallback.unsubscribe = unsubscribe;

  return reactionCallback;
}
