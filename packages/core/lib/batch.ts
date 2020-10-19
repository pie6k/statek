import { ReactNodeArray } from 'react';
import {
  applyReaction,
  isManualReaction,
  ReactionCallback,
  getReactionOptions,
} from './reaction';
import { getDefaultScheduler } from './schedulers';
import { getStoreRaw, isStore } from './store';
import { isReactionSuspended } from './suspense';
import { createStackCallback, noop } from './utils';
export type ReactionScheduler = (
  reaction: ReactionCallback,
) => Promise<void> | void;

export function requestReactionCallNeeded(reaction: ReactionCallback) {
  // Don't request lazy-reaction re-run while it is suspended.
  if (isReactionSuspended(reaction) && isManualReaction(reaction)) {
    return;
  }
  /**
   * We are in 'syncEvery' mode. It means we skip both batching and scheduling and call all
   * reactions instantly.
   */
  if (syncEveryManager.isRunning()) {
    applyReaction(reaction);
    return;
  }

  const isSync = syncManager.isRunning();

  // Both 'sync' and `batch' will schedule reactions in batched mode.
  if (batchManager.isRunning() || isSync) {
    // Send reaction to batch queue.
    reactionsBatchQueue.add(reaction, isSync);
    return;
  }

  // We're not using batch mode - send reaction to scheduler.
  sendReactionToScheduler(reaction, false);
}

/**
 * Ordered map keeping current queue of batched reactions. As it is Map - it keeps proper order of
 * reactions keeping reactions added last at the end of 'entries' of the map.
 *
 * Boolean flag indicates if reaction schould be sync.
 * sync === true - skip scheduler and apply it when flushing.
 * sync === false - when flushing - send reaction to scheduler.
 */
const reactionsQueue = new Map<ReactionCallback, boolean>();

type MapEntry<M extends Map<any, any>> = M extends Map<infer K, infer V>
  ? [K, V]
  : never;

export const reactionsBatchQueue = {
  add(reaction: ReactionCallback, isSync: boolean) {
    reactionsQueue.set(reaction, isSync);
  },
  flush() {
    if (!reactionsQueue.size) {
      return;
    }

    // Make sure to copy reactions instead of iterating on queue set reference.
    // It is because during reaction calls some new reactions could be added to the queue before
    // current flush finishes.
    const reactionsToCall = Array.from(reactionsQueue);

    // Instantly after we have copy of all reactions - clear the queue.
    reactionsQueue.clear();
    // Send reactions to either be called instantly or sent to scheduler depending on if they
    // were sync or not.
    reactionsToCall.forEach(sendQueuedReactionToScheduler);
  },
};

// Map entry wrapper to avoid creating new function ref on each flush.
function sendQueuedReactionToScheduler([reaction, isSync]: MapEntry<
  typeof reactionsQueue
>) {
  sendReactionToScheduler(reaction, isSync);
}

/**
 * This function will decide if to apply it instantly or call it to scheduler depending on if it
 * was scheduled in sync mode or not.
 */
function sendReactionToScheduler(reaction: ReactionCallback, isSync: boolean) {
  // Reaction was scheduled in sync mode. Skip schedulers and apply it instantly.

  if (isSync) {
    applyReaction(reaction);
    return;
  }

  const scheduler =
    getReactionOptions(reaction).scheduler || getDefaultScheduler();

  scheduler(reaction);
}

/**
 * Will delay enqueing reactions until the end of this call. Will also make sure that no same reaction
 * will be scheduled twice at the end of this hook.
 */
export const [batch, batchManager] = createStackCallback(
  reactionsBatchQueue.flush,
);
/**
 * Will skip schedulers, but remain in batch mode. It means that even if async scheduler exists
 * for some reaction - all reactions will be called in batch after this call ends.
 */
export const [sync, syncManager] = createStackCallback(
  reactionsBatchQueue.flush,
);

/**
 * Will disable schedulers and batching. It means each single mutation will instantly call all
 * attached reactions.
 */
export const [syncEvery, syncEveryManager] = createStackCallback(
  reactionsBatchQueue.flush,
);

/**
 * Escape from watching store access.
 *
 * It can be called inside part of `watch` callback and such read access will not be registered.
 */
export const [_dontWatch, dontWatchManager] = createStackCallback(noop);

export function dontWatch<R>(callback: () => R) {
  // make sure to unwrap direct result of the callback eg dontWatch(() => store); - should return store raw object
  const result = _dontWatch(callback);

  if (isStore(result)) {
    return getStoreRaw(result as any);
  }

  return result;
}

export const [allowNestedWatch, allowNestedWatchManager] = createStackCallback(
  noop,
);
