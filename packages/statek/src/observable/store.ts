type TargetKey = string | number | Symbol | undefined;
type ReactionsMapForKeys = Map<TargetKey, Set<Reaction>>;

const connectionStore = new WeakMap<object, ReactionsMapForKeys>();

const observablesOptions = new WeakMap<object, ObservableOptions>();

const ITERATION_KEY = Symbol('iteration key');

export interface ObservableOptions {
  onRead: (operation: OperationInfo) => void;
}

type OperationType =
  | 'get'
  | 'has'
  | 'iterate'
  | 'add'
  | 'delete'
  | 'set'
  | 'clear';

export interface OperationInfo {
  target: object;
  receiver?: object;
  key?: TargetKey;
  value?: any;
  oldValue?: any;
  oldTarget?: any;
  type: OperationType;
}

export function registerNewObservable(
  rawObject: object,
  options?: ObservableOptions,
) {
  // this will be used to save (obj.key -> reaction) connections later
  connectionStore.set(rawObject, new Map());
  if (options) {
    observablesOptions.set(rawObject, options);
  }
}

export function getObservableOptions(
  rawObject: object,
): ObservableOptions | null {
  return observablesOptions.get(rawObject) ?? null;
}

export function registerReactionForOperation(
  reaction: Reaction,
  { target, key, type }: OperationInfo,
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

  // save the fact that the key is used by the reaction during its current run
  if (!reactionsForKey.has(reaction)) {
    reactionsForKey.add(reaction);

    reaction.registeredInPropsGroups.add(reactionsForKey);
  }
}

export function getImpactedReactions({ target, key, type }: OperationInfo) {
  const impactedReactions = new Set<Reaction>();
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

export function releaseReaction(reaction: Reaction) {
  reaction.registeredInPropsGroups.forEach(targetPropReactionsGroup => {
    targetPropReactionsGroup.delete(reaction);
  });
  reaction.registeredInPropsGroups.clear();
}

const IS_REACTION_SYMBOL = Symbol('is reaction');

export interface Reaction<A extends any[] = any, R = any>
  extends ReactionOptions {
  (...args: A): R;
  registeredInPropsGroups: Set<Set<Reaction>>;
  unobserved: boolean;
  [IS_REACTION_SYMBOL]: boolean;
}

export type ReactionScheduler = ((reaction: Reaction) => void) | Set<Reaction>;

export interface ReactionOptions {
  requireParams?: boolean;
  scheduler?: ReactionScheduler;
  debugger?: any;
  lazy?: boolean;
  context?: any;
}

export function isReaction(input: any): input is Reaction {
  return input && input[IS_REACTION_SYMBOL] === true;
}

export type Callback<A extends any[], R> = (...args: A) => R;

export function createReaction<A extends any[], R>(
  callback: Callback<A, R>,
  options?: ReactionOptions,
): Reaction<A, R> {
  const reaction = (callback as any) as Reaction;
  reaction.registeredInPropsGroups = new Set();
  reaction.unobserved = false;
  reaction.scheduler = options?.scheduler;
  reaction.debugger = options?.debugger;
  reaction.lazy = options?.lazy;

  reaction[IS_REACTION_SYMBOL] = true;

  return reaction;
}

function appendSet<T>(set: Set<T>, itemsToAddSet: Set<T>) {
  itemsToAddSet.forEach(item => {
    set.add(item);
  });
}
