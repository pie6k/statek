import { OperationInfo } from './operations';
import { ReactionScheduler } from './scheduler';

type TargetKey = string | number | Symbol | undefined;

export function cleanReactionReadData(reaction: ReactionCallback) {
  const reactionData = getReactionData(reaction);

  // Iterate over each list in which this reaction is registered.
  // Each list represents single key of some proxy object that this reaction readed from.
  reactionData.registeredInReadLists.forEach(targetPropReactionsGroup => {
    // Remove this reaction from such list.
    targetPropReactionsGroup.delete(reaction);
  });

  // As we're removed from each list - clear links that pointed to them.
  reactionData.registeredInReadLists.clear();
}

export type ReactionCallback = () => void;

interface ReactionData {
  options: ReactionOptions;
  registeredInReadLists: Set<Set<ReactionCallback>>;
  isSubscribed: boolean;
}

const registeredReactionsMap = new WeakMap<ReactionCallback, ReactionData>();

export interface ReactionOptions {
  scheduler?: ReactionScheduler;
  debug?: (operation: OperationInfo) => {};
  lazy?: boolean;
  context?: any;
}

export function isReaction(input: ReactionCallback) {
  return registeredReactionsMap.has(input);
}

export type Callback<A extends any[], R> = (...args: A) => R;

export function registerNewReaction(
  callback: ReactionCallback,
  options: ReactionOptions = {},
): ReactionData {
  if (registeredReactionsMap.has(callback)) {
    throw new Error('This reactions is already registered');
  }

  const reactionData: ReactionData = {
    options,
    registeredInReadLists: new Set(),
    isSubscribed: false,
  };
  registeredReactionsMap.set(callback, reactionData);

  return reactionData;
}

export function getReactionData(callback: ReactionCallback): ReactionData {
  const data = registeredReactionsMap.get(callback);

  if (!data) {
    throw new Error('Callback is not an reaction');
  }

  return data;
}
