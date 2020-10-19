export const ITERATION_KEY = Symbol('iteration key');
import { requestReactionCallNeeded } from './batch';
import { getSelectedAnyChangeReactions } from './store';
import {
  ReactionCallback,
  getReactionOptions,
  getReactionEntry,
} from './reaction';
import { detectRunningReactionForOperation } from './reactionsStack';
import { appendSet } from './utils';

type TargetKey = string | number | Symbol | undefined;

export type MutationOperationType = 'add' | 'delete' | 'set' | 'clear';

export interface MutationOperationInfo {
  target: object;
  key?: TargetKey;
  value?: any;
  type: MutationOperationType;
}

export type ReadOperationType = 'get' | 'has' | 'iterate';

export interface ReadOperationInfo {
  target: object;
  key?: TargetKey;
  type: ReadOperationType;
}

export type OperationInfo = ReadOperationInfo | MutationOperationInfo;

type ReactionsMapForKeys = Map<TargetKey, Set<ReactionCallback>>;

const readOperationsRegistry = new WeakMap<object, ReactionsMapForKeys>();

export let readOperationsCount = 0;
export let mutationOperationsCount = 0;

export function _countReadOperations() {
  let startCount = readOperationsCount;

  return function countNow() {
    const result = readOperationsCount - startCount;
    return result;
  };
}

// const _c = _countReadOperations();
// setInterval(() => {
//   console['log'](_c());
// }, 500);

export function initializeObjectReadOperationsRegistry(rawObject: object) {
  // this will be used to save (obj.key -> reaction) connections later
  readOperationsRegistry.set(rawObject, new Map());
}

function registerReactionReadOperation(
  reaction: ReactionCallback,
  readOperation: ReadOperationInfo,
) {
  if (readOperation.type === 'iterate') {
    readOperation.key = ITERATION_KEY;
  }

  const reactionsPropsMapForTarget = readOperationsRegistry.get(
    readOperation.target,
  )!;

  let reactionsForKey = reactionsPropsMapForTarget.get(readOperation.key);

  if (!reactionsForKey) {
    reactionsForKey = new Set();

    reactionsPropsMapForTarget.set(readOperation.key, reactionsForKey);
  }

  // save the fact that the key is used by the reaction during its current run
  if (!reactionsForKey.has(reaction)) {
    reactionsForKey.add(reaction);
    getReactionEntry(reaction).watchedPropertiesMemberships.add(
      reactionsForKey,
    );
  }
}

export function getMutationImpactedReactions(
  mutationOperation: MutationOperationInfo,
) {
  const impactedReactions = getSelectedAnyChangeReactions(
    mutationOperation.target,
  );

  const targetKeysReactionsMap = readOperationsRegistry.get(
    mutationOperation.target,
  )!;

  const reactionsForKey = targetKeysReactionsMap.get(mutationOperation.key);
  reactionsForKey && appendSet(impactedReactions, reactionsForKey);

  // Inform each item when set/map is cleared
  if (mutationOperation.type === 'clear') {
    targetKeysReactionsMap.forEach(reactionsForAnotherProp => {
      appendSet(impactedReactions, reactionsForAnotherProp);
    });
  }

  if (
    mutationOperation.type === 'add' ||
    mutationOperation.type === 'delete' ||
    mutationOperation.type === 'clear' ||
    mutationOperation.type === 'set'
  ) {
    const reactionsForIteration = targetKeysReactionsMap.get(ITERATION_KEY);

    reactionsForIteration &&
      appendSet(impactedReactions, reactionsForIteration);
  }

  return impactedReactions;
}

// register the currently running reaction to be queued again on obj.key mutations
export function handleStoreReadOperation(readOperation: ReadOperationInfo) {
  readOperationsCount++;

  // get the current reaction from the top of the stack
  const runningReaction = detectRunningReactionForOperation(readOperation);

  if (!runningReaction) {
    return;
  }

  debugOperation(runningReaction, readOperation);
  registerReactionReadOperation(runningReaction, readOperation);
}

export function handleStoreMutationOperation(
  mutationOperation: MutationOperationInfo,
) {
  // iterate and queue every reaction, which is triggered by obj.key mutation
  const impactedReactions = getMutationImpactedReactions(mutationOperation);

  impactedReactions.forEach(reaction => {
    debugOperation(reaction, mutationOperation);
    requestReactionCallNeeded(reaction);
  });
}

function debugOperation(
  reaction: ReactionCallback,
  operation: MutationOperationInfo | ReadOperationInfo,
) {
  getReactionOptions(reaction).debug?.(operation);
}
