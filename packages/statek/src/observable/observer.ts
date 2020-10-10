import {
  releaseReaction,
  Reaction,
  isReaction,
  ReactionOptions,
  Callback,
  createReaction,
} from './store';
import { callWithReaction } from './reactionRunner';

type CallbackOrReaction<A extends any[], R> = Callback<A, R> | Reaction<A, R>;

function maybeCreateReaction<A extends any[], R>(
  callbackOrExistingReaction: CallbackOrReaction<A, R>,
  options: ReactionOptions = {},
) {
  if (isReaction(callbackOrExistingReaction)) {
    return callbackOrExistingReaction;
  }

  const reaction = createReaction<A, R>(callbackOrExistingReaction, options);

  return reaction;
}

export function disconnectReaction(reaction: Reaction) {
  // do nothing, if the reaction is already unobserved
  if (!reaction.unobserved) {
    // indicate that the reaction should not be triggered any more
    reaction.unobserved = true;
    // release (obj -> key -> reaction) connections
    releaseReaction(reaction);
  }
  // unschedule the reaction, if it is scheduled
  if (typeof reaction.scheduler === 'object') {
    reaction.scheduler.delete(reaction);
  }
}

export function observe<A extends any[], R>(
  callbackOrExistingReaction: CallbackOrReaction<A, R>,
  options: ReactionOptions = {},
  eagerCallArgs?: A,
): Reaction<A, R> {
  const reaction: Reaction<A, R> = isReaction(callbackOrExistingReaction)
    ? callbackOrExistingReaction
    : createReaction(function observeReaction(...args: A): R {
        if (options.requireParams && args.length === 0) {
          throw new Error('params required');
        }
        return callWithReaction(reaction, callbackOrExistingReaction, args);
      }, options);

  if (!options.lazy && !options.requireParams) {
    reaction.apply(options.context ?? null);
  } else if (!options.lazy && eagerCallArgs) {
    reaction.apply(options.context ?? null, eagerCallArgs);
    // reaction(...eagerCallArgs);
  }

  return reaction;
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

export function unobserve(reaction: Reaction<any, any>) {
  // do nothing, if the reaction is already unobserved
  if (!reaction.unobserved) {
    // indicate that the reaction should not be triggered any more
    reaction.unobserved = true;
    // release (obj -> key -> reaction) connections
    releaseReaction(reaction);
  }
  // unschedule the reaction, if it is scheduled
  if (typeof reaction.scheduler === 'object') {
    reaction.scheduler.delete(reaction);
  }
}
