import { ReactionCallback, reactionSchedulers } from './reaction';
export type ReactionScheduler = (reaction: ReactionCallback) => void;
const batchStack: boolean[] = [];

// this runs the passed function and delays all re-renders
// until the function is finished running
// react renders are batched by unstable_batchedUpdates
// autoEffects and other custom reactions are batched by our scheduler
export function batch(fn: (args: any) => void, ctx?: any, args?: any) {
  batchStack.push(true);

  try {
    return fn.apply(ctx, args);
  } finally {
    batchStack.pop();

    if (batchStack.length === 0) {
      reactionsBatchScheduler.flush();
    }
  }
}

export function enqueueReactionCall(reaction: ReactionCallback) {
  if (batchStack.length === 0) {
    performReactionCall(reaction);
    return;
  }

  reactionsBatchScheduler.add(reaction);
}

const reactionsQueue = new Set<ReactionCallback>();

export const reactionsBatchScheduler = {
  add(reaction: ReactionCallback) {
    reactionsQueue.add(reaction);
  },
  flush() {
    if (!reactionsQueue.size) {
      return;
    }

    const reactionsToCall = Array.from(reactionsQueue);
    reactionsQueue.clear();
    reactionsToCall.forEach(performReactionCall);
  },
};

function performReactionCall(reaction: ReactionCallback) {
  const scheduler = reactionSchedulers.get(reaction);
  if (scheduler) {
    scheduler(reaction);
    return;
  }

  reaction();
}
