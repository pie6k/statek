import { requestReactionCallNeeded } from '../batch';
import {
  isManualReaction,
  ManualReactionCallback,
  ReactionCallback,
} from '../reaction';

// TODO suspense mode
export type SuspenseMode = 'batch' | 'no-batch';

export const reactionSuspenseMode = new WeakMap<
  ReactionCallback,
  SuspenseMode
>();

const reactionPendingPromises = new WeakMap<
  ReactionCallback,
  Set<Promise<any>>
>();

export function clearReactionPendingPromises(reaction: ReactionCallback) {
  let pendingPromises = reactionPendingPromises.get(reaction);

  if (!pendingPromises) {
    return;
  }

  pendingPromises.clear();
}

export function addReactionPendingPromise(
  reaction: ReactionCallback,
  promise: Promise<any>,
) {
  let pendingPromises = reactionPendingPromises.get(reaction);

  if (!pendingPromises) {
    pendingPromises = new Set();
    reactionPendingPromises.set(reaction, pendingPromises);
  }

  pendingPromises.add(promise);
}

function getAllPendingReactionsResolvedPromise(
  reaction: ReactionCallback,
): Promise<any> {
  let alreadyPending = reactionPendingPromises.get(reaction);

  if (!alreadyPending) {
    return Promise.resolve();
  }

  return Promise.all(alreadyPending);
}

const reactionSuspendRetries = new WeakMap<ReactionCallback, number>();

export function isReactionSuspended(reaction: ReactionCallback) {
  return reactionSuspendRetries.has(reaction);
}

const MAX_ALLOWED_SUSPENSE_RETRIES = 5;

export function callWithSuspense<A extends any[], R>(
  callback: ManualReactionCallback<A, R>,
  reaction: ManualReactionCallback<A, R>,
  ...args: A
): R {
  const retries = reactionSuspendRetries.get(reaction) ?? 0;

  if (retries > MAX_ALLOWED_SUSPENSE_RETRIES) {
    const errorMessage =
      'The same reaction suspended 5 times in a row. Assuming error to avoid infinite loop. Some promise is that is suspending is probably re-created on each call';
    if (process.env.NODE_ENV !== 'production') {
      console.warn(errorMessage);
    }
    throw new Error(errorMessage);
  }

  try {
    const result = callback(...args);

    // Did properly resolve. Let's reset suspended retries counter
    reactionSuspendRetries.delete(reaction);
    return result;
  } catch (errorOrPromise) {
    reactionSuspendRetries.set(reaction, retries + 1);

    if (errorOrPromise instanceof Promise) {
      addReactionPendingPromise(reaction, errorOrPromise);
      const allPendingResolvedPromise = getAllPendingReactionsResolvedPromise(
        reaction,
      );

      allPendingResolvedPromise
        .then(() => {
          // trying again
          requestReactionCallNeeded(reaction);
        })
        .catch(error => {
          // since watch is called by itself after suspended and retried - there is no way this error could be catched.
          // As promises it suspended with are provided by user - if they don't have .catch by themselves - it seems ok to
          // result with uncaught promise exception.
          // ?  throw error;
        });

      if (isManualReaction(reaction)) {
        throw allPendingResolvedPromise;
      }

      // we don't have to return watch result value while it's suspended for non-lazy reactions
      // @ts-ignore
      return;
    }

    // Error.
    throw errorOrPromise;
  }
}
