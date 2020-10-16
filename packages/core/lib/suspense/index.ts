import { requestReactionCallNeeded } from '../batch';
import { ReactionCallback } from '../reaction';

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

function suspendReaction(reaction: ReactionCallback, promise: Promise<any>) {
  let alreadyPending = reactionPendingPromises.get(reaction);

  if (!alreadyPending) {
    throw promise;
  }

  alreadyPending.add(promise);

  throw Promise.all(alreadyPending);
}

// export function callWithSuspenseo(
//   callback: ReactionCallback,
//   reaction: ReactionCallback,
// ) {
//   try {
//     callback();
//   } catch (errorOrPromise) {
//     if (errorOrPromise instanceof Promise) {
//       errorOrPromise.then(() => {
//         requestReactionCallNeeded(reaction);
//       });
//     } else {
//       throw errorOrPromise;
//     }
//   } finally {
//   }
// }

export function callWithSuspense(
  callback: ReactionCallback,
  reaction: ReactionCallback,
  depth = 0,
): void {
  if (depth === 0) {
    clearReactionPendingPromises(reaction);
  }

  if (depth > 5) {
    throw new Error(
      'The same reaction suspended 5 times in a row. Assuming error to avoid infinite loop. Some promise is that is suspending is probably re-created on each call',
    );
  }

  try {
    return callback();
  } catch (errorOrPromise) {
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
          console.log('err');
        });

      return;
    }

    // Error.
    throw errorOrPromise;
  }
}
