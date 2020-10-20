import { dontWatchManager } from './batch';
import { warnIfUsingInternal } from './internal';
import { ReadOperationInfo } from './operations';
import {
  cleanReactionReadData,
  ReactionCallback,
  getReactionOptions,
  isReactionErased,
  ReactionsSet,
  isReaction,
} from './reaction';

type WatchingReaction = ReactionCallback | InjectedReaction;

// reactions can call each other and form a call stack
const watchingReactionsStack: WatchingReaction[] = [];

export function callWithReactionsStack<C extends ReactionCallback>(
  reactionCallback: C,
  functionToCall: C,
  ...args: any[]
) {
  const runningReaction = getRunningReaction();

  if (runningReaction) {
    addReactionParent(reactionCallback, runningReaction);
  }

  clearReactionChildren(reactionCallback);

  const context = getReactionOptions(reactionCallback).context;

  if (isReactionErased(reactionCallback)) {
    throw new Error('Cannot call reaction that is stopped.');
  }

  if (watchingReactionsStack.includes(reactionCallback)) {
    throw new Error(
      'Recursive reaction calling itself detected. It might be caused by reaction mutating the store in a way that triggers it before it has finished or by 2 different manual reactions calling each other.',
    );
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

function getLastRunningReactionFromStack() {
  if (watchingReactionsStack.length === 0) {
    return null;
  }

  let hookedReaction: WatchingReaction;
  for (let i = watchingReactionsStack.length - 1; i >= 0; i--) {
    hookedReaction = watchingReactionsStack[i];

    if (typeof hookedReaction === 'function') {
      return hookedReaction;
    }

    if (
      isReactionErased(hookedReaction.reaction) ||
      !hookedReaction.getIsStillRunning()
    ) {
      continue;
    }

    return hookedReaction.reaction;
  }

  return null;
}

export function getRunningReaction() {
  // Is some regular reaction is running - return it
  // if (watchingReactionsStack[watchingReactionsStack.length - 1]) {
  //   return watchingReactionsStack[watchingReactionsStack.length - 1]!;
  // }

  return getLastRunningReactionFromStack();
}

export function detectRunningReactionForOperation(
  readOperation: ReadOperationInfo,
): ReactionCallback | null {
  // If dontWatch is running - we're totally ingoring reactions.
  if (dontWatchManager.isRunning()) {
    return null;
  }

  const lastRunningReactionOnStack = getLastRunningReactionFromStack();

  if (lastRunningReactionOnStack) {
    return lastRunningReactionOnStack;
  }

  // Check if regular reaction is running - if so - return it and dont continue to custom hooks.

  // Check if we have any reaction hooks running.
  if (injectReactionHooks.size > 0) {
    let hookedReactionInfo: InjectedReaction | null;
    for (let nextCurrentReactionHook of injectReactionHooks) {
      hookedReactionInfo = nextCurrentReactionHook(readOperation);

      if (!hookedReactionInfo) {
        continue;
      }

      if (!isReaction(hookedReactionInfo.reaction)) {
        throw new Error(
          'Function returned from `registerGetCurrentReactionHook` is not a reaction. It needs to be wrapped in registerReaction first.',
        );
      }

      return hookedReactionInfo.reaction;
    }
  }

  return null;
}

export interface InjectedReaction {
  reaction: ReactionCallback;
  getIsStillRunning: () => boolean;
}

type InjectReactionHook = (
  readOperation: ReadOperationInfo,
) => InjectedReaction | null;

const injectReactionHooks = new Set<InjectReactionHook>();

/**
 * @internal
 */
export function addInjectReactionHook(hook: InjectReactionHook) {
  warnIfUsingInternal('registerReadOperationReactionHook');
  injectReactionHooks.add(hook);

  return function remove() {
    injectReactionHooks.delete(hook);
  };
}

/**
 * @internal
 */
export function injectReaction(injectedReaction: InjectedReaction) {
  warnIfUsingInternal('injectReaction');
  watchingReactionsStack.push(injectedReaction);

  return function removeInjected() {
    if (watchingReactionsStack.length === 0) {
      throw new Error(
        'Cannot remove injected reaction as there are no injected reactions',
      );
    }

    if (
      watchingReactionsStack[watchingReactionsStack.length - 1] !==
      injectedReaction
    ) {
      throw new Error(
        'Calling remove reaction after some other reactions were injected',
      );
    }

    watchingReactionsStack.pop();
  };
}

// Parents

const reactionParents = new WeakMap<ReactionCallback, ReactionsSet>();
const reactionChildren = new WeakMap<ReactionCallback, ReactionsSet>();

function addReactionParent(child: ReactionCallback, parent: ReactionCallback) {
  let parents = reactionParents.get(child);
  let parentChildren = reactionChildren.get(parent);

  if (!parentChildren) {
    parentChildren = new Set();
    reactionChildren.set(parent, parentChildren);
  }

  if (!parents) {
    parents = new Set();
    reactionParents.set(child, parents);
  }

  parents.add(parent);
  parentChildren.add(child);
}

function clearReactionChildren(parent: ReactionCallback) {
  const children = reactionChildren.get(parent);

  if (!children) {
    return;
  }

  let nextChildParents: ReactionsSet;

  children.forEach(nextChild => {
    nextChildParents = reactionParents.get(nextChild)!;
    if (nextChildParents) {
      nextChildParents.delete(parent);
    }
    children.delete(nextChild);
  });
}

export function getReactionRootReactions(
  reaction: ReactionCallback,
  rootParentsSet?: Set<ReactionCallback>,
) {
  if (!rootParentsSet) {
    rootParentsSet = new Set();
  }

  const parents = reactionParents.get(reaction);

  if (!parents) {
    rootParentsSet.add(reaction);
    return rootParentsSet;
  }

  parents.forEach(parent => {
    getReactionRootReactions(parent, rootParentsSet);
  });

  return rootParentsSet;
}
