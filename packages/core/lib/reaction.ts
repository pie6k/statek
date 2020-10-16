import { ReactionScheduler } from './batch';
import { warnIfUsingInternal } from './internal';
import { OperationInfo } from './operations';

export type ReactionsSet = Set<ReactionCallback>;
export type ReactionsMemberships = Set<ReactionsSet>;

type ReactionStoppedCallback = () => void;

const callbacksReactions = new WeakMap<
  // Original reaction callback
  () => void,
  ReactionCallback
>();
export const reactionWatchedPropertiesMemberships = new WeakMap<
  ReactionCallback,
  ReactionsMemberships
>();
export const reactionSchedulers = new WeakMap<
  ReactionCallback,
  ReactionScheduler
>();
export const reactionContext = new WeakMap<ReactionCallback, any>();
const unsubscribedReactions = new WeakSet<ReactionCallback>();
export const reactionStopSubscribers = new WeakMap<
  ReactionCallback,
  Set<ReactionStoppedCallback>
>();
export const reactionDebugger = new WeakMap<
  ReactionCallback,
  ReactionDebugger
>();

export const lazyReactionsCallbacks = new WeakMap<
  ReactionCallback,
  ReactionCallback
>();

export function isLazyReaction(reaction: ReactionCallback) {
  return lazyReactionsCallbacks.has(reaction);
}

/**
 * @internal
 */
export function registerLazyReactionCallback(
  reaction: ReactionCallback,
  callback: ReactionCallback,
) {
  if (!isReaction(reaction)) {
    throw new Error('Only reaction can have apply callback');
  }

  lazyReactionsCallbacks.set(reaction, callback);
}

export function cleanReactionReadData(reaction: ReactionCallback) {
  const propsMemberships = reactionWatchedPropertiesMemberships.get(reaction)!;

  // Iterate over each list in which this reaction is registered.
  // Each list represents single key of some proxy object that this reaction readed from.
  propsMemberships.forEach(propReactions => {
    // Remove this reaction from such list.
    propReactions.delete(reaction);
  });

  // As we're removed from each list - clear links that pointed to them.
  propsMemberships.clear();
}

export type ReactionCallback = () => void;
export type LazyReactionCallback<A extends any[], R> = (...args: A) => R;
export type ReactionDebugger = (operation: OperationInfo) => {};

export interface ReactionOptions {
  scheduler?: ReactionScheduler;
  debug?: (operation: OperationInfo) => {};
  context?: any;
  name?: string;
}

export function getCallbackWrapperReaction(input: ReactionCallback) {
  return callbacksReactions.get(input);
}

export function applyReaction(reaction: ReactionCallback) {
  if (lazyReactionsCallbacks.has(reaction)) {
    lazyReactionsCallbacks.get(reaction)!();
    return;
  }

  reaction.apply(reactionContext.get(reaction));
}

export function isReaction(reaction: ReactionCallback) {
  return reactionWatchedPropertiesMemberships.has(reaction);
}

/**
 * @internal
 */
export function registerReaction(
  reaction: ReactionCallback,
  originalCallback: ReactionCallback,
  options: ReactionOptions = {},
) {
  warnIfUsingInternal('registerReaction');

  if (callbacksReactions.has(reaction)) {
    throw new Error('This reactions is already registered');
  }

  callbacksReactions.set(originalCallback, reaction);

  if (options.context) {
    reactionContext.set(reaction, options.context);
  }

  if (options.scheduler) {
    reactionSchedulers.set(reaction, options.scheduler);
  }

  if (options.debug) {
    reactionDebugger.set(reaction, options.debug);
  }

  if (options.name) {
    Object.defineProperty(reaction, 'name', { value: options.name });
  }

  reactionWatchedPropertiesMemberships.set(reaction, new Set());

  return reaction;
}

export function stopReaction(reaction: ReactionCallback) {
  if (isReactionStopped(reaction)) {
    console.warn(`Stopping the reaction that is already stopped.`);
    return;
  }

  if (!isReaction(reaction)) {
    throw new Error('Cannot stop function that is not a reaction');
  }

  if (unsubscribedReactions.has(reaction)) {
    return;
  }

  unsubscribedReactions.add(reaction);
  cleanReactionReadData(reaction);
  callbacksReactions.delete(reaction);

  const stopSubscribers = reactionStopSubscribers.get(reaction);

  if (stopSubscribers) {
    stopSubscribers.forEach(subscriber => {
      subscriber();
    });
  }
}

export function resetReaction(reaction: ReactionCallback) {
  if (!isReaction(reaction)) {
    throw new Error('Cannot stop non reaction');
  }

  unsubscribedReactions.delete(reaction);
  cleanReactionReadData(reaction);
}

export function isReactionStopped(reaction: ReactionCallback) {
  if (!isReaction(reaction)) {
    throw new Error('Checking if reaction is stopped providing non reaction');
  }

  return unsubscribedReactions.has(reaction);
}

export function subscribeToReactionStopped(
  reaction: ReactionCallback,
  callback: ReactionStoppedCallback,
) {
  if (!isReaction(reaction)) {
    throw new Error('Cannot subscribe to stop of non-reaction');
  }

  // If this reaction is already stopped - call callback instantly
  if (unsubscribedReactions.has(reaction)) {
    callback();
    // but still add it to list of listeners in case this reaction is started and stopped again.
  }

  let subscribers = reactionStopSubscribers.get(reaction);

  if (!subscribers) {
    subscribers = new Set();
    reactionStopSubscribers.set(reaction, subscribers);
  }

  subscribers.add(callback);
}
