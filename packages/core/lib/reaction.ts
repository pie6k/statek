import { OperationInfo } from './operations';
import { ReactionScheduler } from './scheduler';

type ReactionsSet = Set<ReactionCallback>;

const registeredReactions = new WeakMap<ReactionCallback, boolean>();
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
export type ReactionDebugger = (operation: OperationInfo) => {};

export interface ReactionOptions {
  scheduler?: ReactionScheduler;
  debug?: (operation: OperationInfo) => {};
  lazy?: boolean;
  context?: any;
}

export function isReaction(input: ReactionCallback) {
  return registeredReactions.has(input);
}

export type Callback<A extends any[], R> = (...args: A) => R;

export function registerNewReaction(
  callback: ReactionCallback,
  options: ReactionOptions = {},
) {
  if (registeredReactions.has(callback)) {
    throw new Error('This reactions is already registered');
  }

  registeredReactions.set(callback, true);

  if (options.context) {
    reactionContext.set(callback, options.context);
  }

  if (options.scheduler) {
    reactionSchedulers.set(callback, options.scheduler);
  }

  if (options.debug) {
    reactionDebugger.set(callback, options.debug);
  }

  reactionWatchedPropertiesMemberships.set(callback, new Set());
}
