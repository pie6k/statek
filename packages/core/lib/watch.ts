import {
  cleanReactionReadData,
  isReaction,
  ReactionCallback,
  ReactionOptions,
  registerNewReaction,
  unsubscribedReactions,
} from './reaction';
import { callWithReaction } from './reactionRunner';

export type ObseringReactionCallback = ReactionCallback & {
  unsubscribe(): void;
};

export function watch(
  callback: ReactionCallback,
  options: ReactionOptions = {},
): ObseringReactionCallback {
  if (isReaction(callback)) {
    return callback as ObseringReactionCallback;
  }
  function reactionCallback() {
    return callWithReaction(reactionCallback, callback);
  }

  registerNewReaction(reactionCallback, options);

  unsubscribedReactions.delete(reactionCallback);

  function unsubscribe() {
    cleanReactionReadData(reactionCallback);
    unsubscribedReactions.add(reactionCallback);
  }

  reactionCallback.unsubscribe = unsubscribe;

  if (options.lazy) {
    return reactionCallback;
  }

  reactionCallback();

  return reactionCallback;
}
