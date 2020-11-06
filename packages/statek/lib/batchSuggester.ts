import { ReactionCallback } from './reaction';
import { createAsyncScheduler } from './schedulers';

const reactionsInFrameCallsMap = new Map<ReactionCallback, number>();

let awaitingCheck: ReturnType<typeof setTimeout> | null = null;

function performCheck() {
  for (const [reaction, callsCount] of reactionsInFrameCallsMap.entries()) {
    if (callsCount > 1) {
      console.warn(
        `Reaction (${reaction.name}) was called ${callsCount} in single frame. Consider using batch`,
      );
    }
  }

  reactionsInFrameCallsMap.clear();
}

function scheduleCheck() {
  if (awaitingCheck) {
    return;
  }
  awaitingCheck = setTimeout(() => {
    performCheck();
    awaitingCheck = null;
  }, 0);
}

export function registerReactionApplied(reaction: ReactionCallback) {
  const count = reactionsInFrameCallsMap.get(reaction) ?? 0;

  reactionsInFrameCallsMap.set(reaction, count + 1);

  if (count > 1) {
    console.warn('foo');
  }

  scheduleCheck();
}
