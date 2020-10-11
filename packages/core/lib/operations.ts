export const ITERATION_KEY = Symbol('iteration key');
import { getReactionData, ReactionCallback } from './reaction';
import { getCurrentReaction } from './reactionRunner';

type TargetKey = string | number | Symbol | undefined;
type ReactionsMapForKeys = Map<TargetKey, Set<ReactionCallback>>;

const readOperationsRegistry = new WeakMap<object, ReactionsMapForKeys>();

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

export function initializeObjectOperationsRegistry(rawObject: object) {
  // this will be used to save (obj.key -> reaction) connections later
  readOperationsRegistry.set(rawObject, new Map());
}

export function registerReactionReadOperation(
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

    const reactionData = getReactionData(reaction);

    reactionData.registeredInReadLists.add(reactionsForKey);
  }
}

export function getMutationImpactedReactions(
  mutationOperation: MutationOperationInfo,
) {
  const impactedReactions = new Set<ReactionCallback>();
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

function appendSet<T>(set: Set<T>, setToAppend: Set<T>) {
  setToAppend.forEach(item => {
    set.add(item);
  });
}

// register the currently running reaction to be queued again on obj.key mutations
export function handleObservableReadOperation(
  readOperation: ReadOperationInfo,
) {
  // warnIfAccessingInNonReactiveComponent();
  // get the current reaction from the top of the stack
  const runningReaction = getCurrentReaction();

  if (!runningReaction) {
    return;
  }

  debugOperation(runningReaction, readOperation);
  registerReactionReadOperation(runningReaction, readOperation);
}

export function handleObservableMutationOperation(
  mutationOperation: MutationOperationInfo,
) {
  // iterate and queue every reaction, which is triggered by obj.key mutation
  const impactedReactions = getMutationImpactedReactions(mutationOperation);

  impactedReactions.forEach(reaction => {
    enqueueReactionCall(mutationOperation, reaction);
  });
}

function enqueueReactionCall(
  operation: MutationOperationInfo,
  reaction: ReactionCallback,
) {
  const { options } = getReactionData(reaction);
  debugOperation(reaction, operation);

  if (options.scheduler) {
    options.scheduler(reaction);
    return;
  }

  reaction();
}

function debugOperation(
  reaction: ReactionCallback,
  operation: MutationOperationInfo | ReadOperationInfo,
) {
  getReactionData(reaction).options.debug?.(operation);
}
