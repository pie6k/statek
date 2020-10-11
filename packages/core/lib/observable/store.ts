import { ITERATION_KEY } from './internals';

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

export function registerNewObservable(rawObject: object) {
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

export type ReactionScheduler = (reaction: ReactionCallback) => void;

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

function appendSet<T>(set: Set<T>, setToAppend: Set<T>) {
  setToAppend.forEach(item => {
    set.add(item);
  });
}
