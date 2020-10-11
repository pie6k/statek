import { ReactionScheduler } from './batch';
import { OperationInfo } from './operations';

type ReactionsSet = Set<ReactionCallback>;

export const callbacksReactions = new WeakMap<
  ReactionCallback,
  ReactionCallback
>();
export const reactionWatchedPropertiesMemberships = new WeakMap<
  ReactionCallback,
  Set<ReactionsSet>
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

export function registerNewReaction(
  reaction: ReactionCallback,
  originalCallback: ReactionCallback,
  options: ReactionOptions = {},
) {
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
}
