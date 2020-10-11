import {
  cleanReactionReadData,
  ReactionCallback,
  isReaction,
  ReactionOptions,
  Callback,
  registerNewReaction,
  getReactionData,
} from './store';
import { callWithReaction } from './reactionRunner';

export type ObseringReactionCallback = ReactionCallback & {
  unsubscribe(): void;
};

export function autoRun(
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

  2;

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
