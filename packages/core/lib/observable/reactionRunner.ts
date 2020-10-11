// import { warnIfAccessingInNonReactiveComponent } from '../view';
import {
  getReactionData,
  getMutationImpactedReactions,
  MutationOperationInfo,
  ReactionCallback,
  ReadOperationInfo,
  registerReactionReadOperation,
  cleanReactionReadData,
} from './store';

// reactions can call each other and form a call stack
const watchingReactionsStack: ReactionCallback[] = [];

export function callWithReaction(
  reactionCallback: ReactionCallback,
  functionToCall: ReactionCallback,
) {
  const reactionData = getReactionData(reactionCallback);
  const context = reactionData.options.context ?? null;

  if (!reactionData.isSubscribed) {
    return Reflect.apply(functionToCall, context, []);
  }

  if (watchingReactionsStack.includes(reactionCallback)) {
    return;
  }

  // release the (obj -> key -> reactions) connections
  // and reset the cleaner connections
  cleanReactionReadData(reactionCallback);

  try {
    // set the reaction as the currently running one
    // this is required so that we can create (observable.prop -> reaction) pairs in the get trap
    watchingReactionsStack.push(reactionCallback);
    return Reflect.apply(
      functionToCall,
      reactionData.options.context ?? null,
      [],
    );
  } finally {
    // always remove the currently running flag from the reaction when it stops execution
    watchingReactionsStack.pop();
  }
}

// register the currently running reaction to be queued again on obj.key mutations
export function handleObservableReadOperation(
  readOperation: ReadOperationInfo,
) {
  // warnIfAccessingInNonReactiveComponent();
  // get the current reaction from the top of the stack
  const runningReaction = getCurrentReaction();

  if (!runningReaction) {
    return;
  }

  debugOperation(runningReaction, readOperation);
  registerReactionReadOperation(runningReaction, readOperation);
}

export function handleObservableMutationOperation(
  mutationOperation: MutationOperationInfo,
) {
  // iterate and queue every reaction, which is triggered by obj.key mutation
  const impactedReactions = getMutationImpactedReactions(mutationOperation);

  impactedReactions.forEach(reaction => {
    enqueueReactionCall(mutationOperation, reaction);
  });
}

function enqueueReactionCall(
  operation: MutationOperationInfo,
  reaction: ReactionCallback,
) {
  const { options } = getReactionData(reaction);
  debugOperation(reaction, operation);

  if (options.scheduler) {
    options.scheduler(reaction);
    return;
  }

  reaction();
}

function debugOperation(
  reaction: ReactionCallback,
  operation: MutationOperationInfo | ReadOperationInfo,
) {
  getReactionData(reaction).options.debug?.(operation);
}

export function isAnyReactionRunning() {
  return watchingReactionsStack.length > 0;
}

export function getCurrentReaction(): ReactionCallback | null {
  return watchingReactionsStack[watchingReactionsStack.length - 1] ?? null;
}
