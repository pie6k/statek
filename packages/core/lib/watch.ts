import {
  cleanReactionReadData,
  isReaction,
  AnyReactionCallback,
  ReactionOptions,
  registerNewReaction,
  unsubscribedReactions,
  LazyReactionCallback,
} from './reaction';
import { callWithReaction } from './reactionRunner';

export function watch(
  callback: AnyReactionCallback,
  options: ReactionOptions = {},
): () => void {
  if (isReaction(callback)) {
    return function unsubscribe() {
      cleanReactionReadData(callback);
      unsubscribedReactions.add(reactionCallback);
    };
  }
  function reactionCallback() {
    return callWithReaction(reactionCallback, callback);
  }

  registerNewReaction(reactionCallback, options);

  unsubscribedReactions.delete(reactionCallback);

  reactionCallback();

  function unsubscribe() {
    cleanReactionReadData(reactionCallback);
    unsubscribedReactions.add(reactionCallback);
  }

  return unsubscribe;
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
    return callWithReaction(reactionCallback, callback);
  }

  registerNewReaction(reactionCallback, {
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
