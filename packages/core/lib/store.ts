import { readStoreManager } from './batch';
import {
  initializeObjectReadOperationsRegistry,
  ReadOperationInfo,
} from './operations';
import { canWrapInProxy, wrapObjectInProxy } from './proxy';
import { isReaction, ReactionCallback, ReactionsSet } from './reaction';
import { isAnyReactionRunning } from './reactionsStack';
import { appendSet, isPrimitive } from './utils';

export const storeToRawMap = new WeakMap();
export const rawToStoreMap = new WeakMap();

/**
 * Nomenclature.
 *
 * 'Store' name is used for any store itself as well as any observable part of it.
 *
 * Eg. const a = store({foo: {bar: 2}});
 * a is store,
 * but a.foo is store as well.
 */

/**
 * Map that links store children to parent store.
 */
const targetParentTarget = new WeakMap<object, object>();

/**
 * Map that keeps list of reactions that should be called if any child part of given store
 * is modified.
 *
 * This, together with child -> parent map allows us to detect and pick reactions at any level.
 */
const selectedAnyChangeReactions = new WeakMap<object, ReactionsSet>();

export function registerSelectedAnyChangeReaction(
  store: object,
  reaction: ReactionCallback,
) {
  if (!isStore(store)) {
    throw new Error('Any change observable can only be added on observable');
  }

  const observableRaw = getStoreRaw(store)!;

  let currentReactionsSet = selectedAnyChangeReactions.get(observableRaw);

  if (!currentReactionsSet) {
    currentReactionsSet = new Set();
    selectedAnyChangeReactions.set(observableRaw, currentReactionsSet);
  }

  if (!isReaction(reaction)) {
    throw new Error('Only reaction can be added to any change watching');
  }

  currentReactionsSet.add(reaction);

  return function remove() {
    currentReactionsSet!.delete(reaction);
  };
}

/**
 * Will check if store part or any parent part is watched by any change reactions.
 *
 * It is very similar to `getStoreAnyChangeWatchingReactions` which returns actual list of reactions.
 *
 * This one is however simpler and faster, because it could be called very often.
 */
function isSelectedAnyChangeWatched(selectedRaw: object) {
  // This store part is watched directly
  if (selectedAnyChangeReactions.get(selectedRaw)?.size) {
    return true;
  }

  // Check all parents to see if any is watched.
  let parent = targetParentTarget.get(selectedRaw);

  while (parent) {
    if (selectedAnyChangeReactions.get(parent)?.size) {
      return true;
    }
    parent = targetParentTarget.get(parent);
  }

  return false;
}

/**
 * Will return all any change reactions of store part or any parent part.
 *
 * Should be used only if we know that there is some such reaction with `isStoreAnyChangeWatched`
 * because it is more expensive to run then previous one.
 */
export function getSelectedAnyChangeReactions(storePartRaw: object) {
  const reactions = new Set<ReactionCallback>();

  // Get direct reactions
  appendSet(reactions, selectedAnyChangeReactions.get(storePartRaw));

  // Collect reactions from all parents.
  let parent = targetParentTarget.get(storePartRaw);

  while (parent) {
    appendSet(reactions, selectedAnyChangeReactions.get(parent));

    parent = targetParentTarget.get(parent);
  }

  return reactions;
}

export type StoreFactory<T extends object> = T | (() => T);

export function store<T extends object>(storeFactory: StoreFactory<T>): T {
  const storeInput = resolveStoreFactory(storeFactory);

  const canWrapInProxyError = canWrapInProxy(storeInput);
  if (canWrapInProxyError !== true) {
    const untypedInput = storeInput as any;
    const inputConstructorName =
      untypedInput?.constructor?.name ?? untypedInput?.name ?? 'Unknown';
    throw new Error(
      `Observable cannot be created from ${inputConstructorName}. Reason - ${canWrapInProxyError}`,
    );
  }
  // if it is already an observable or it should not be wrapped, return it
  if (storeToRawMap.has(storeInput)) {
    return storeInput;
  }

  // if it already has a cached observable wrapper, return it
  const existingObservable = rawToStoreMap.get(storeInput);

  if (existingObservable) {
    return existingObservable;
  }

  // otherwise create a new observable

  const newStore = wrapObjectInProxy(storeInput);
  // save these to switch between the raw object and the wrapped object with ease later
  rawToStoreMap.set(storeInput, newStore);
  storeToRawMap.set(newStore, storeInput);
  // init basic data structures to save and cleanup later (observable.prop -> reaction) connections
  initializeObjectReadOperationsRegistry(storeInput);

  return newStore;
}

export function createChildStoreIfNeeded(
  storePartRaw: object,
  parentRaw: object,
  readOperation: ReadOperationInfo,
) {
  const observableObj = rawToStoreMap.get(storePartRaw);

  // If we have observable already created - always return it
  if (observableObj) {
    return observableObj;
  }

  // If it's not possible to create observable - no point of checking if we should create it.
  if (canWrapInProxy(storePartRaw) !== true) {
    return storePartRaw;
  }

  // Observable is not yet created.

  // We'll wrap raw into proxy:
  // If we're during read observable callback - always wrap.
  // If any reaction is currently in progress
  // If any reaction is watching entire parent of object we want to wrap now

  // Otherwise we can safely return raw object.

  if (
    !readStoreManager.isRunning() &&
    !isAnyReactionRunning(readOperation) &&
    !isSelectedAnyChangeWatched(parentRaw)
  ) {
    return storePartRaw;
  }

  targetParentTarget.set(storePartRaw, parentRaw);
  return store(storePartRaw);
}

export function isStore(store: object) {
  return storeToRawMap.has(store);
}

export function getStoreRaw<T extends object>(store: T): T {
  if (!isStore(store)) {
    throw new Error(
      'trying to get raw object from input that is not observable',
    );
  }

  return storeToRawMap.get(store)!;
}

export function resolveStoreFactory<T extends object>(
  factory: StoreFactory<T>,
): T {
  if (typeof factory === 'function') {
    return (factory as any)() as T;
  }

  return factory as T;
}
