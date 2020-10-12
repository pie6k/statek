import { ReactNodeArray } from 'react';
import {
  applyReaction,
  ReactionCallback,
  reactionSchedulers,
} from './reaction';
import { getDefaultScheduler } from './schedulers';
import { noop } from './utils';
export type ReactionScheduler = (
  reaction: ReactionCallback,
) => Promise<void> | void;

export function requestReactionCallNeeded(reaction: ReactionCallback) {
  if (syncEveryManager.isRunning()) {
    applyReaction(reaction);
    return;
  }

  const isSync = syncManager.isRunning();
  if (batchManager.isRunning() || isSync) {
    reactionsBatchQueue.add(reaction, isSync);
    return;
  }

  sendReactionToScheduler(reaction, false);
}

interface QueuedReaction {
  reaction: ReactionCallback;
  isSync: boolean;
}

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

    const reactionsToCall = Array.from(reactionsQueue);
    reactionsQueue.clear();
    reactionsToCall.forEach(sendQueuedReactionToScheduler);
  },
};

function sendQueuedReactionToScheduler([reaction, isSync]: MapEntry<
  typeof reactionsQueue
>) {
  sendReactionToScheduler(reaction, isSync);
}

function sendReactionToScheduler(reaction: ReactionCallback, isSync: boolean) {
  if (isSync) {
    applyReaction(reaction);
    return;
  }

  const scheduler = reactionSchedulers.get(reaction) || getDefaultScheduler();

  scheduler(reaction);
}

export const [batch, batchManager] = createStackCallback(
  reactionsBatchQueue.flush,
);
export const [sync, syncManager] = createStackCallback(
  reactionsBatchQueue.flush,
);

export const [syncEvery, syncEveryManager] = createStackCallback(
  reactionsBatchQueue.flush,
);

export const [dontWatch, dontWatchManager] = createStackCallback(noop);

function createStackCallback(onFinish: () => void) {
  const callsStack: boolean[] = [];

  function perform(fn: (args: any) => void, ctx?: any, args?: any) {
    callsStack.push(true);

    try {
      return fn.apply(ctx, args);
    } finally {
      callsStack.pop();

      if (callsStack.length === 0) {
        onFinish();
      }
    }
  }

  function isRunning() {
    return callsStack.length > 0;
  }

  const manager = {
    isRunning,
  };
  return [perform, manager] as const;
}
