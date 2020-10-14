import { dontWatchManager } from './batch';
import { warnIfUsingInternal } from './internal';
import { ReadOperationInfo } from './operations';
import {
  cleanReactionReadData,
  ReactionCallback,
  reactionContext,
  unsubscribedReactions,
} from './reaction';

// reactions can call each other and form a call stack
const watchingReactionsStack: ReactionCallback[] = [];

type CurrentReactionHook = (
  readOperation: ReadOperationInfo,
) => ReactionCallback | null;

const currentReactionHooks = new Set<CurrentReactionHook>();

/**
 * @internal
 */
export function registerGetCurrentReactionHook(hook: CurrentReactionHook) {
  warnIfUsingInternal('registerReadOperationReactionHook');
  currentReactionHooks.add(hook);

  return function remove() {
    currentReactionHooks.delete(hook);
  };
}

export function callWithReactionsStack<C extends ReactionCallback>(
  reactionCallback: C,
  functionToCall: C,
  ...args: any[]
) {
  const context = reactionContext.get(reactionCallback);

  if (unsubscribedReactions.has(reactionCallback)) {
    return Reflect.apply(functionToCall, context, args);
  }

  if (watchingReactionsStack.includes(reactionCallback)) {
    return;
  }

  // release the (obj -> key -> reactions) connections
  // and reset the cleaner connections
  cleanReactionReadData(reactionCallback);

  try {
    // set the reaction as the currently running one
    // this is required so that we can create (store.prop -> reaction) pairs in the get trap
    watchingReactionsStack.push(reactionCallback);
    return Reflect.apply(functionToCall, context ?? null, args);
  } finally {
    // always remove the currently running flag from the reaction when it stops execution
    watchingReactionsStack.pop();
  }
}

export function isAnyReactionRunning(
  readOperation: ReadOperationInfo,
): boolean {
  return !!getCurrentReaction(readOperation);
}

export function getCurrentReaction(
  readOperation: ReadOperationInfo,
): ReactionCallback | null {
  if (dontWatchManager.isRunning()) {
    return null;
  }

  let foundReaction: ReactionCallback | undefined | null =
    watchingReactionsStack[watchingReactionsStack.length - 1];

  if (foundReaction) {
    return foundReaction;
  }

  if (currentReactionHooks.size > 0) {
    for (let reactionCreator of currentReactionHooks) {
      foundReaction = reactionCreator(readOperation);

      if (foundReaction) {
        return foundReaction;
      }
    }
  }

  return null;
}
