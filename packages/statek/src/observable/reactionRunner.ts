import { warnIfAccessingInNonReactiveComponent } from '../view';
import {
  getImpactedReactions,
  OperationInfo,
  Reaction,
  registerReactionForOperation,
  releaseReaction,
  getObservableOptions,
} from './store';

// reactions can call each other and form a call stack
const watchingReactionsStack: Reaction[] = [];

let isDebugging = false;

export function callWithReaction<A extends any[], R>(
  callbackRerunReaction: Reaction<A, R>,
  callbackToRun: (...args: A) => R,
  args: A,
): R {
  // do not build reactive relations, if the reaction is unobserved
  if (callbackRerunReaction.unobserved) {
    return Reflect.apply(
      callbackToRun,
      callbackRerunReaction.context ?? null,
      args,
    ) as R;
  }

  // only run the reaction if it is not already in the reaction stack
  // TODO: improve this to allow explicitly recursive reactions
  if (watchingReactionsStack.indexOf(callbackRerunReaction) === -1) {
    // release the (obj -> key -> reactions) connections
    // and reset the cleaner connections
    releaseReaction(callbackRerunReaction);

    try {
      // set the reaction as the currently running one
      // this is required so that we can create (observable.prop -> reaction) pairs in the get trap
      watchingReactionsStack.push(callbackRerunReaction);
      return Reflect.apply(
        callbackToRun,
        callbackRerunReaction.context ?? null,
        args,
      ) as R;
    } finally {
      // always remove the currently running flag from the reaction when it stops execution
      watchingReactionsStack.pop();
    }
  }

  return undefined as any;
}

// register the currently running reaction to be queued again on obj.key mutations
export function handleObservableReadOperation(operation: OperationInfo) {
  warnIfAccessingInNonReactiveComponent();
  // get the current reaction from the top of the stack
  const runningReaction = getCurrentReaction();

  const options = getObservableOptions(operation.target);

  options?.onRead(operation);

  if (runningReaction) {
    debugOperation(runningReaction, operation);
    registerReactionForOperation(runningReaction, operation);
  }
}

export function handleObservableMutationOperation(operation: OperationInfo) {
  // iterate and queue every reaction, which is triggered by obj.key mutation
  const impactedReactions = getImpactedReactions(operation);

  impactedReactions.forEach(reaction => {
    enqueueSingleReaction(operation, reaction);
  });
}

function enqueueSingleReaction(operation: OperationInfo, reaction: Reaction) {
  debugOperation(reaction, operation);

  // queue the reaction for later execution or run it immediately
  if (typeof reaction.scheduler === 'function') {
    reaction.scheduler(reaction);
  } else if (typeof reaction.scheduler === 'object') {
    reaction.scheduler.add(reaction);
  } else {
    reaction();
  }
}

function debugOperation(reaction: Reaction, operation: OperationInfo) {
  if (reaction.debugger && !isDebugging) {
    try {
      isDebugging = true;
      reaction.debugger(operation);
    } finally {
      isDebugging = false;
    }
  }
}

export function hasRunningReaction() {
  return watchingReactionsStack.length > 0;
}

export function getCurrentReaction(): Reaction | null {
  return watchingReactionsStack[watchingReactionsStack.length - 1] ?? null;
}
