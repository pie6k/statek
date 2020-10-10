import { warnIfAccessingInNonReactiveComponent } from '../view';
import {
  getReactionData,
  getImpactedReactions,
  MutationOperationInfo,
  ReactionCallback,
  ReadOperationInfo,
  registerReactionReadOperation,
  releaseReaction,
} from './store';

// reactions can call each other and form a call stack
const watchingReactionsStack: ReactionCallback[] = [];

let isDebugging = true;

export function callWithReaction(
  reactionCallback: ReactionCallback,
  functionToCall: ReactionCallback,
) {
  const reactionData = getReactionData(reactionCallback);
  const context = reactionData.options.context ?? null;

  if (!reactionData.isSubscribed) {
    return Reflect.apply(functionToCall, context, []);
  }

  // do not build reactive relations, if the reaction is unobserved
  // if (callbackRerunReaction.unobserved) {
  //   return Reflect.apply(
  //     callbackToRun,
  //     callbackRerunReaction.context ?? null,
  //     args,
  //   ) as R;
  // }

  if (watchingReactionsStack.includes(reactionCallback)) {
    return;
  }

  // only run the reaction if it is not already in the reaction stack
  // TODO: improve this to allow explicitly recursive reactions

  // release the (obj -> key -> reactions) connections
  // and reset the cleaner connections

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
  // console.log({ readOperation });
  warnIfAccessingInNonReactiveComponent();
  // get the current reaction from the top of the stack
  const runningReaction = getCurrentReaction();

  if (runningReaction) {
    debugOperation(runningReaction, readOperation);
    registerReactionReadOperation(runningReaction, readOperation);
  }
}

export function handleObservableMutationOperation(
  mutationOperation: MutationOperationInfo,
) {
  // console.log({ mutationOperation });
  // iterate and queue every reaction, which is triggered by obj.key mutation
  const impactedReactions = getImpactedReactions(mutationOperation);

  // console.log({ impactedReactions });

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
  const { options } = getReactionData(reaction);
  if (!options.debug) {
    return;
  }

  options.debug(operation);
}

export function hasRunningReaction() {
  return watchingReactionsStack.length > 0;
}

export function getCurrentReaction(): ReactionCallback | null {
  return watchingReactionsStack[watchingReactionsStack.length - 1] ?? null;
}
