type TargetKey = string | number | Symbol | undefined;
type ReactionsMapForKeys = Map<TargetKey, Set<ReactionCallback>>;

const connectionStore = new WeakMap<object, ReactionsMapForKeys>();

const ITERATION_KEY = Symbol('iteration key');

export type MutationOperationType = 'add' | 'delete' | 'set' | 'clear';

export interface MutationOperationInfo {
  target: object;
  receiver?: object;
  key?: TargetKey;
  value?: any;
  oldValue?: any;
  oldTarget?: any;
  type: MutationOperationType;
}

export type ReadOperationType = 'get' | 'has' | 'iterate';

export interface ReadOperationInfo {
  target: object;
  receiver?: object;
  key?: TargetKey;
  type: ReadOperationType;
}

export type OperationInfo = ReadOperationInfo | MutationOperationInfo;

// registeredInPropsGroups

export function registerNewObservable(rawObject: object) {
  // this will be used to save (obj.key -> reaction) connections later
  connectionStore.set(rawObject, new Map());
}

export function registerReactionReadOperation(
  reaction: ReactionCallback,
  { target, key, type }: ReadOperationInfo,
) {
  if (type === 'iterate') {
    key = ITERATION_KEY;
  }

  const reactionsPropsMapForTarget = connectionStore.get(target)!;

  let reactionsForKey = reactionsPropsMapForTarget.get(key);

  if (!reactionsForKey) {
    reactionsForKey = new Set();
    reactionsPropsMapForTarget.set(key, reactionsForKey);
  }

  const reactionData = getReactionData(reaction);

  // save the fact that the key is used by the reaction during its current run
  if (!reactionsForKey.has(reaction)) {
    reactionsForKey.add(reaction);

    reactionData.linkedForProps.add(reactionsForKey);
  }
}

export function getImpactedReactions({
  target,
  key,
  type,
}: MutationOperationInfo) {
  const impactedReactions = new Set<ReactionCallback>();
  const targetReactionsMap = connectionStore.get(target)!;

  const reactionsForKey = targetReactionsMap.get(key);

  // Inform each item when set/map is cleared
  if (type === 'clear') {
    targetReactionsMap.forEach(reactionsForAnotherProp => {
      appendSet(impactedReactions, reactionsForAnotherProp);
    });
  }

  reactionsForKey && appendSet(impactedReactions, reactionsForKey);

  if (type === 'add' || type === 'delete' || type === 'clear') {
    const iterationKey = Array.isArray(target) ? 'length' : ITERATION_KEY;
    const reactionsForLength = targetReactionsMap.get(iterationKey);
    reactionsForLength && appendSet(impactedReactions, reactionsForLength);
  }

  return impactedReactions;
}

export function releaseReaction(reaction: ReactionCallback) {
  const reactionData = getReactionData(reaction);

  reactionData.linkedForProps.forEach(targetPropReactionsGroup => {
    targetPropReactionsGroup.delete(reaction);
  });

  reactionData.linkedForProps.clear();

  reactionData.isSubscribed = false;
}

export type ReactionScheduler = (reaction: ReactionCallback) => void;

export type ReactionCallback = () => void;

interface ReactionData {
  options: ReactionOptions;
  linkedForProps: Set<Set<ReactionCallback>>;
  isSubscribed: boolean;
}

const reactionsOptionsMap = new WeakMap<ReactionCallback, ReactionData>();

export interface ReactionOptions {
  scheduler?: ReactionScheduler;
  debug?: (operation: OperationInfo) => {};
  lazy?: boolean;
  context?: any;
}

export function isReaction(input: ReactionCallback) {
  return reactionsOptionsMap.has(input);
}

export type Callback<A extends any[], R> = (...args: A) => R;

export function registerReaction(
  callback: ReactionCallback,
  options: ReactionOptions = {},
): ReactionData {
  if (reactionsOptionsMap.has(callback)) {
    throw new Error('This reactions is already registered');
  }

  const reactionData: ReactionData = {
    options,
    linkedForProps: new Set(),
    isSubscribed: false,
  };
  reactionsOptionsMap.set(callback, reactionData);

  return reactionData;
}

export function getReactionData(callback: ReactionCallback): ReactionData {
  const data = reactionsOptionsMap.get(callback);

  if (!data) {
    throw new Error('Callback is not an reaction');
  }

  return data;
}

function appendSet<T>(set: Set<T>, itemsToAddSet: Set<T>) {
  itemsToAddSet.forEach(item => {
    set.add(item);
  });
}
