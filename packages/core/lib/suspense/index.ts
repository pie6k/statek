import { requestReactionCallNeeded } from '../batch';
import { ReactionCallback } from '../reaction';

export function callWithSuspense(
  callback: ReactionCallback,
  reaction: ReactionCallback,
) {
  try {
    callback();
  } catch (errorOrPromise) {
    if (errorOrPromise instanceof Promise) {
      errorOrPromise.then(() => {
        requestReactionCallNeeded(reaction);
      });
    } else {
      throw errorOrPromise;
    }
  } finally {
  }
}
