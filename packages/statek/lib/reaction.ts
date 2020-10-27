import { ReactionScheduler } from './batch';
import { warnIfUsingInternal } from './internal';
import { OperationInfo } from './operations';
import { SchedulerInput } from './schedulers';
import { EventCallback } from './utils';

export type ReactionsSet = Set<ReactionCallback>;
export type ReactionsMemberships = Set<ReactionsSet>;

type ReactionStoppedCallback = () => void;

const callbackReaction = new WeakMap<
  // Original reaction callback
  () => void,
  ReactionCallback
>();

// Erased reactions are fully removed from registry. This is to keep track of them and be able to
// warn user or ignore 1+ calls to erase instead of throwing.
const erasedReactions = new WeakSet<ReactionCallback>();

export const reactionsRegistry = new WeakMap<ReactionCallback, ReactionEntry>();

interface ReactionEntry {
  wrappedCallback: ReactionCallback;
  options: ReactionOptions;
  stopSubscribers: Set<ReactionStoppedCallback>;
  manualCallback: ReactionCallback | null;
  watchedPropertiesMemberships: ReactionsMemberships;
}

export function getReactionEntry(reaction: ReactionCallback) {
  const info = reactionsRegistry.get(reaction);

  if (!info) {
    console.log(reaction);
    throw new Error('Trying to get options for non-reaction');
  }

  return info;
}

export function getReactionOptions(reaction: ReactionCallback) {
  return getReactionEntry(reaction).options;
}

export function isManualReaction(reaction: ReactionCallback) {
  return !!getReactionEntry(reaction).manualCallback;
}

/**
 * @internal
 */
export function registerLazyReactionCallback(
  reaction: ReactionCallback,
  callback: ReactionCallback,
) {
  warnIfUsingInternal('registerLazyReactionCallback');

  const entry = getReactionEntry(reaction);

  if (entry.manualCallback) {
    throw new Error('Reaction already has manual callback');
  }

  entry.manualCallback = callback;
}

export function cleanReactionReadData(reaction: ReactionCallback) {
  const entry = getReactionEntry(reaction);
  const propsMemberships = entry.watchedPropertiesMemberships;

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
export type ManualReactionCallback<A extends any[], R> = (...args: A) => R;
export type ReactionDebugger = (operation: OperationInfo) => {};

export interface ReactionOptions {
  scheduler?: SchedulerInput;
  debug?: (operation: OperationInfo) => {};
  // Will be passed as 'this' argument during watch reaction call
  context?: any;
  // Debug helper
  name?: string;
  // Called every time any selector used during the reaction starts to silently update itself
  onSilentUpdate?: EventCallback<Promise<any>>;
}

export function getCallbackWrapperReaction(input: ReactionCallback) {
  return callbackReaction.get(input);
}

export function applyReaction(reaction: ReactionCallback) {
  if (isReactionErased(reaction)) {
    return;
  }

  const entry = getReactionEntry(reaction);
  if (entry.manualCallback) {
    entry.manualCallback();
    return;
  }

  const context = getReactionOptions(reaction).context;

  reaction.apply(context);
}

/**
 * Returns true if provided callback is a reaction
 */
export function isReaction(reaction: ReactionCallback) {
  return reactionsRegistry.has(reaction);
}

/**
 * @internal
 */
export function registerReaction(
  reaction: ReactionCallback,
  wrappedCallback: ReactionCallback,
  options: ReactionOptions = {},
) {
  warnIfUsingInternal('registerReaction');

  if (reactionsRegistry.has(reaction)) {
    throw new Error('This reaction is already registered');
  }

  if (callbackReaction.has(wrappedCallback)) {
    throw new Error('This callback is already wrapped in reaction');
  }

  callbackReaction.set(wrappedCallback, reaction);

  if (options.name) {
    Object.defineProperty(reaction, 'name', { value: options.name });
  }

  const entry: ReactionEntry = {
    manualCallback: null,
    options,
    stopSubscribers: new Set(),
    watchedPropertiesMemberships: new Set(),
    wrappedCallback,
  };

  reactionsRegistry.set(reaction, entry);

  return reaction;
}

export function eraseReaction(reaction: ReactionCallback) {
  if (isReactionErased(reaction)) {
    console.warn(`Stopping the reaction that is already stopped.`);
    return;
  }

  if (!isReaction(reaction)) {
    throw new Error('Cannot stop function that is not a reaction');
  }

  const entry = getReactionEntry(reaction);

  cleanReactionReadData(reaction);
  erasedReactions.add(reaction);
  callbackReaction.delete(entry.wrappedCallback);

  reactionsRegistry.delete(reaction);

  entry.stopSubscribers.forEach(subscriber => {
    subscriber();
  });
}

export function resetReaction(reaction: ReactionCallback) {
  if (!isReaction(reaction)) {
    throw new Error('Cannot stop non reaction');
  }

  erasedReactions.delete(reaction);
  cleanReactionReadData(reaction);
}

export function isReactionErased(reaction: ReactionCallback) {
  if (erasedReactions.has(reaction)) {
    return true;
  }

  if (!isReaction(reaction)) {
    throw new Error('Checking if reaction is stopped providing non reaction');
  }

  return false;
}

export function subscribeToReactionStopped(
  reaction: ReactionCallback,
  callback: ReactionStoppedCallback,
) {
  // If this reaction is already stopped - call callback instantly
  if (erasedReactions.has(reaction)) {
    callback();
    // but still add it to list of listeners in case this reaction is started and stopped again.
  }

  if (!isReaction(reaction)) {
    throw new Error('Cannot subscribe to stop of non-reaction');
  }

  const { stopSubscribers } = getReactionEntry(reaction);

  stopSubscribers.add(callback);

  return function stop() {
    stopSubscribers.delete(callback);
  };
}
