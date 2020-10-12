import {
  cleanReactionReadData,
  hasCallbackReaction,
  ReactionCallback,
  ReactionOptions,
  registerReaction,
  unsubscribedReactions,
  LazyReactionCallback,
  callbacksReactions,
} from './reaction';
import { callWithReactionsStack } from './reactionsStack';
import { deepRead } from './utils';

export function watch(
  callback: ReactionCallback,
  options: ReactionOptions = {},
): () => void {
  if (hasCallbackReaction(callback)) {
    return function unsubscribe() {
      cleanReactionReadData(callback);
      unsubscribedReactions.add(reactionCallback);
    };
  }
  function reactionCallback() {
    return callWithReactionsStack(reactionCallback, callback);
  }

  registerReaction(reactionCallback, callback, options);

  unsubscribedReactions.delete(reactionCallback);

  reactionCallback();

  function unsubscribe() {
    cleanReactionReadData(reactionCallback);
    unsubscribedReactions.add(reactionCallback);
    callbacksReactions.delete(callback);
  }

  return unsubscribe;
}

export function watchEager(
  callback: ReactionCallback,
  observable: object,
  options: ReactionOptions = {},
): () => void {
  return watch(() => {
    deepRead(observable);
    callback();
  }, options);
}

export type ObseringReactionCallback<A extends any[], R> = LazyReactionCallback<
  A,
  R
> & {
  unsubscribe(): void;
};

const noop = () => {};

export function lazyWatch<A extends any[], R>(
  callback: LazyReactionCallback<A, R>,
  onObservedChange: () => void = noop,
  context?: any,
): ObseringReactionCallback<A, R> {
  function reactionCallback(...args: A): R {
    if (unsubscribedReactions.has(reactionCallback)) {
      throw new Error(
        `Cannot call lazyWatch callback after it has unsubscribed`,
      );
    }
    return callWithReactionsStack(reactionCallback, callback);
  }

  registerReaction(reactionCallback, callback, {
    context,
    scheduler: onObservedChange,
  });

  unsubscribedReactions.delete(reactionCallback);

  function unsubscribe() {
    cleanReactionReadData(reactionCallback);
    unsubscribedReactions.add(reactionCallback);
  }

  reactionCallback.unsubscribe = unsubscribe;

  return reactionCallback;
}
