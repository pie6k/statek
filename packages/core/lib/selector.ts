import { allowNestedWatch, dontWatch, syncEvery } from './batch';
import { ReactionCallback, subscribeToReactionStopped } from './reaction';
import { getRunningReaction } from './reactionsStack';
import { singleValueResource, SingleValueResource } from './resource';
import { store } from './store';
import { serialize } from './utils';
import { manualWatch, watch } from './watch';

export type SelectorValue<T> = {
  read: SyncValue<T>;
};

export type SyncValue<T> = T extends Promise<infer U> ? U : T;

export type Selector<Args extends any[], T> = ((
  ...args: Args
) => SelectorValue<T>) & {
  getRaw: (...args: Args) => T;
};

const suspendedPromises = new WeakSet<Promise<any>>();

if (process.env.NODE_ENV !== 'production') {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', errorEvent => {
      if (
        errorEvent.error instanceof Promise &&
        suspendedPromises.has(errorEvent.error)
      ) {
        console.error(
          `Async selector suspended, but it's promise was not caught. If you want to manually resolve selector promise, call selector.getRaw instead. Otherwise - async selector should should be called during render function of React component.`,
        );
      }
    });
  }
}

export interface SingleValueSelector<T> {
  value: SyncValue<T>;
}

export interface SelectorOptions {
  lazy?: boolean;
}

export function selector<V>(
  getter: () => V,
  options: SelectorOptions = {},
): SingleValueSelector<V> {
  let resource: SingleValueResource<V>;

  const selectorValueStore = store<SingleValueSelector<V>>({
    // We'll initialize this value on first run, but we don't want to read resource now if this selector
    // is lazy
    value: null as any,
  });

  function initResource() {
    if (resource) {
      return;
    }

    let didResolveAtLeastOnce = false;

    resource = singleValueResource(getter, {
      // Each time resource value is resolved - instantly set it as selector store value.
      onResolved(newValue) {
        didResolveAtLeastOnce = true;
        selectorValueStore.value = newValue;
      },
      onRejected(error) {
        if (options.lazy || didResolveAtLeastOnce) {
          return;
        }

        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `Selector rejected before being used with error:`,
            error,
          );
        }
      },
    });
  }

  let stopWatching: (() => void) | null = null;

  function startWatchingIfNeeded() {
    if (stopWatching) {
      return;
    }

    startWatching();
  }

  function startWatching() {
    if (stopWatching) {
      throw new Error('Cannot start selector watching if its already watching');
    }
    initResource();
    stopWatching = allowNestedWatch(() => {
      return watch(() => {
        resource.forceUpdate();
      });
    });
  }

  const selectorWrapper = {
    get value() {
      initResource();
      const runningReaction = getRunningReaction();

      if (options.lazy && !runningReaction) {
        resource.read();
        return selectorValueStore.value;
      }

      startWatchingIfNeeded();
      // If this selector is lazy - watch if it is accessed during some other reaction.
      // If this is the case - we'll stop this selector watcher when all watching reactions that
      // access this reaction will stop.
      options.lazy &&
        runningReaction &&
        subscribeToReactionStopInLazyMode(runningReaction);

      // Read resource in order to suspend it or throw if there is some error inside of it.
      resource.read();

      return selectorValueStore.value;
    },
  };

  if (!options.lazy) {
    startWatchingIfNeeded();

    const status = resource!.getStatus();

    if (status.state === 'getterError') {
      throw status.error;
    }
  }

  const reactionsWatchingThisSelector = new WeakSet<ReactionCallback>();

  let reactionsWatchingThisSelectorCount = 0;

  function subscribeToReactionStopInLazyMode(reaction: ReactionCallback) {
    if (reactionsWatchingThisSelector.has(reaction)) {
      return;
    }

    reactionsWatchingThisSelector.add(reaction);
    reactionsWatchingThisSelectorCount++;

    function handleReactionDidStop() {
      if (!stopWatching) {
        return;
      }
      // When some reaction using this selector stops - remove it from list of reactions
      reactionsWatchingThisSelector.delete(reaction);
      reactionsWatchingThisSelectorCount--;

      // If it was the last reaction watching this selector - stop updating selected value
      if (reactionsWatchingThisSelectorCount === 0) {
        stopWatching();
        stopWatching = null;
      }
    }

    subscribeToReactionStopped(reaction, handleReactionDidStop);
  }

  return selectorWrapper;
}

export type SelectorFamily<Args extends any[], R> = (
  ...args: Args
) => SingleValueSelector<R>;

export function selectorFamily<Args extends any[], R>(
  getter: (...args: Args) => R,
  options?: SelectorOptions,
): SelectorFamily<Args, R> {
  const serializedArgsSelectorsMap = new Map<string, SingleValueSelector<R>>();

  function getArgsSelector(...args: Args): SingleValueSelector<R> {
    const serializedArgs = serialize(args);
    if (serializedArgsSelectorsMap.has(serializedArgs)) {
      return serializedArgsSelectorsMap.get(serializedArgs)!;
    }

    const argsSelector = selector(() => {
      return getter(...args);
    }, options);

    serializedArgsSelectorsMap.set(serializedArgs, argsSelector);

    return argsSelector;
  }

  function get(...args: Args): SingleValueSelector<R> {
    return getArgsSelector(...args);
  }

  return get;
}
