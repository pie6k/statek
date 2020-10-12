import { ReactionCallback, reactionSchedulers } from './reaction';
import { getDefaultScheduler } from './schedulers';
export type ReactionScheduler = (
  reaction: ReactionCallback,
) => Promise<void> | void;

const batchStack: boolean[] = [];

export function batch(fn: (args: any) => void, ctx?: any, args?: any) {
  batchStack.push(true);

  try {
    return fn.apply(ctx, args);
  } finally {
    batchStack.pop();

    if (batchStack.length === 0) {
      reactionsBatchQueue.flush();
    }
  }
}

export function requestReactionCallNeeded(reaction: ReactionCallback) {
  if (batchStack.length === 0) {
    sendReactionToScheduler(reaction);
    return;
  }

  reactionsBatchQueue.add(reaction);
}

const reactionsQueue = new Set<ReactionCallback>();

export const reactionsBatchQueue = {
  add(reaction: ReactionCallback) {
    reactionsQueue.add(reaction);
  },
  flush() {
    if (!reactionsQueue.size) {
      return;
    }

    const reactionsToCall = Array.from(reactionsQueue);
    reactionsQueue.clear();
    reactionsToCall.forEach(sendReactionToScheduler);
  },
};

export function sendReactionToScheduler(reaction: ReactionCallback) {
  const scheduler = reactionSchedulers.get(reaction);
  if (scheduler) {
    scheduler(reaction);
    return;
  }

  getDefaultScheduler()(reaction);
}
