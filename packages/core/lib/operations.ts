export const ITERATION_KEY = Symbol('iteration key');
import { requestReactionCallNeeded } from './batch';
import { getSelectedAnyChangeReactions } from './store';
import {
  ReactionCallback,
  reactionDebugger,
  reactionWatchedPropertiesMemberships,
} from './reaction';
import { getCurrentReaction } from './reactionsStack';
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
    reactionWatchedPropertiesMemberships.get(reaction)!.add(reactionsForKey);
  }
}

function getMutationImpactedReactions(
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
    mutationOperation.type === 'clear'
  ) {
    const iterationKey = Array.isArray(mutationOperation.target)
      ? 'length'
      : ITERATION_KEY;

    const reactionsForIteration = targetKeysReactionsMap.get(iterationKey);

    reactionsForIteration &&
      appendSet(impactedReactions, reactionsForIteration);
  }

  return impactedReactions;
}

// register the currently running reaction to be queued again on obj.key mutations
export function handleStoreReadOperation(readOperation: ReadOperationInfo) {
  // get the current reaction from the top of the stack
  const runningReaction = getCurrentReaction(readOperation);

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
  reactionDebugger.get(reaction)?.(operation);
}
