import {
  releaseReaction,
  ReactionCallback,
  isReaction,
  ReactionOptions,
  Callback,
  registerReaction,
  getReactionData,
} from './store';
import { callWithReaction } from './reactionRunner';

export type ObseringReactionCallback = ReactionCallback & {
  unsubscribe(): void;
};

export function observe(
  callback: ReactionCallback,
  options: ReactionOptions = {},
): ObseringReactionCallback {
  if (isReaction(callback)) {
    return callback as ObseringReactionCallback;
  }
  function reactionCallback() {
    return callWithReaction(reactionCallback, callback);
  }

  const reactionData = registerReaction(reactionCallback, options);

  reactionData.isSubscribed = true;

  function unsubscribe() {
    releaseReaction(reactionCallback);
  }

  reactionCallback.unsubscribe = unsubscribe;

  if (options.lazy) {
    return reactionCallback;
  }

  reactionCallback();

  return reactionCallback;
}

// export function autoRun(
//   callbackOrExistingReaction: CallbackOrReaction<any, any>,
//   options: ReactionOptions = {},
// ): Reaction<[], void> {
//   const reaction = maybeCreateReaction<[], void>(
//     callbackOrExistingReaction,
//     options,
//   );
//   function wrappedCallback(): void {
//     return callWithReaction(reaction, callbackOrExistingReaction, []);
//   }

//   if (!options.lazy) {
//     wrappedCallback();
//   }

//   const wrappedReaction = maybeCreateReaction<[], void>(
//     wrappedCallback,
//     options,
//   );

//   return wrappedReaction;
// }
