import { dontWatchManager } from './batch';
import { warnIfUsingInternal } from './internal';
import { ReadOperationInfo } from './operations';
import {
  cleanReactionReadData,
  ReactionCallback,
  reactionContext,
  isReactionStopped,
  ReactionsSet,
  isReaction,
} from './reaction';

// reactions can call each other and form a call stack
const watchingReactionsStack: ReactionCallback[] = [];

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

  const context = reactionContext.get(reactionCallback);

  if (isReactionStopped(reactionCallback)) {
    throw new Error('Cannot call reaction that is stopped.');
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

const hookedReactions: InjectedReaction[] = [];

function cleanHookedReactions() {}

function getInjectedRunningReaction() {
  if (!hookedReactions.length) {
    return null;
  }

  let hookedReaction: InjectedReaction;
  for (let i = hookedReactions.length - 1; i >= 0; i--) {
    hookedReaction = hookedReactions[i];

    if (!hookedReaction.getIsStillRunning()) {
      continue;
    }

    return hookedReaction.reaction;
  }

  return null;
}

export function getRunningReaction() {
  // Is some regular reaction is running - return it
  if (watchingReactionsStack[watchingReactionsStack.length - 1]) {
    return watchingReactionsStack[watchingReactionsStack.length - 1]!;
  }

  return getInjectedRunningReaction();
}

export function detectRunningReactionForOperation(
  readOperation: ReadOperationInfo,
): ReactionCallback | null {
  // If dontWatch is running - we're totally ingoring reactions.
  if (dontWatchManager.isRunning()) {
    return null;
  }

  // Check if regular reaction is running - if so - return it and dont continue to custom hooks.
  if (watchingReactionsStack[watchingReactionsStack.length - 1]) {
    return watchingReactionsStack[watchingReactionsStack.length - 1]!;
  }

  const injectedRunningReaction = getInjectedRunningReaction();

  if (injectedRunningReaction) {
    return injectedRunningReaction;
  }

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

      hookedReactions.push(hookedReactionInfo);
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
  hookedReactions.push(injectedReaction);
}
