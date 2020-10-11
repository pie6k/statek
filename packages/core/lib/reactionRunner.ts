import {
  cleanReactionReadData,
  getReactionData,
  ReactionCallback,
} from './reaction';

// reactions can call each other and form a call stack
const watchingReactionsStack: ReactionCallback[] = [];

type CurrentReactionHook = () => ReactionCallback | null;

const currentReactionHooks: CurrentReactionHook[] = [];

export function registerCurrentReactionHook(hook: CurrentReactionHook) {
  currentReactionHooks.push(hook);

  return function remove() {
    // TODO implement
  };
}

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

export function isAnyReactionRunning(): boolean {
  return !!getCurrentReaction();
}

export function getCurrentReaction(): ReactionCallback | null {
  let foundReaction: ReactionCallback | undefined | null =
    watchingReactionsStack[watchingReactionsStack.length - 1];

  if (foundReaction) {
    return foundReaction;
  }

  if (currentReactionHooks.length > 0) {
    for (let reactionCreator of currentReactionHooks) {
      foundReaction = reactionCreator();

      if (foundReaction) {
        return foundReaction;
      }
    }
  }

  return null;
}
