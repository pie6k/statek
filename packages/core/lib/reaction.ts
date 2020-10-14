import { ReactionScheduler } from './batch';
import { warnIfUsingInternal } from './internal';
import { OperationInfo } from './operations';

export type ReactionsSet = Set<ReactionCallback>;
export type ReactionsMemberships = Set<ReactionsSet>;

export const callbacksReactions = new WeakMap<
  ReactionCallback,
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
export const unsubscribedReactions = new WeakSet<ReactionCallback>();
export const reactionDebugger = new WeakMap<
  ReactionCallback,
  ReactionDebugger
>();

export const lazyReactionsCallbacks = new WeakMap<
  ReactionCallback,
  ReactionCallback
>();

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

export function isLazyReaction(reaction: ReactionCallback) {
  return lazyReactionsCallbacks.has(reaction);
}

export function getLazyReactionCallback(reaction: ReactionCallback) {
  return lazyReactionsCallbacks.has(reaction);
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
}

export function hasCallbackReaction(input: ReactionCallback) {
  return callbacksReactions.has(input);
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

  reactionWatchedPropertiesMemberships.set(reaction, new Set());

  return reaction;
}
