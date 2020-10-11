import {
  cleanReactionReadData,
  isReaction,
  ReactionCallback,
  ReactionOptions,
  registerNewReaction,
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

  const reactionData = registerNewReaction(reactionCallback, options);

  reactionData.isSubscribed = true;

  function unsubscribe() {
    cleanReactionReadData(reactionCallback);
    reactionData.isSubscribed = false;
  }

  reactionCallback.unsubscribe = unsubscribe;

  if (options.lazy) {
    return reactionCallback;
  }

  reactionCallback();

  return reactionCallback;
}
