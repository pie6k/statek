import { OperationInfo } from './operations';
import { ReactionScheduler } from './scheduler';

type ReactionsSet = Set<AnyReactionCallback>;

const registeredReactions = new WeakMap<AnyReactionCallback, boolean>();
export const reactionWatchedPropertiesMemberships = new WeakMap<
  AnyReactionCallback,
  Set<ReactionsSet>
>();
export const reactionSchedulers = new WeakMap<
  AnyReactionCallback,
  ReactionScheduler
>();
export const reactionContext = new WeakMap<AnyReactionCallback, any>();
export const unsubscribedReactions = new WeakSet<AnyReactionCallback>();
export const reactionDebugger = new WeakMap<
  AnyReactionCallback,
  ReactionDebugger
>();

export function cleanReactionReadData(reaction: AnyReactionCallback) {
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

export type AnyReactionCallback = () => void;
export type LazyReactionCallback<A extends any[], R> = (...args: A) => R;
export type ReactionDebugger = (operation: OperationInfo) => {};

export interface ReactionOptions {
  scheduler?: ReactionScheduler;
  debug?: (operation: OperationInfo) => {};
  context?: any;
}

export function isReaction(input: AnyReactionCallback) {
  return registeredReactions.has(input);
}

export function registerNewReaction(
  callback: AnyReactionCallback,
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
