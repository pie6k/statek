import { ReactionCallback, subscribeToReactionStopped } from './reaction';
import { getRunningReaction } from './reactionsStack';
import { store } from './store';
import { serialize } from './utils';
import { watch } from './watch';
import { allowNestedWatch, syncEvery } from './batch';

import { resource } from './resource';

export type SyncValue<T> = T extends Promise<infer U> ? U : T;

export type Selector<Args extends any[], T> = ((
  ...args: Args
) => SyncValue<T>) & {
  getRaw: (...args: Args) => T;
};

type WrappedValue<T> = {
  value: T;
};

type CurrentlySuspended<T> = {
  promise: T;
  wrappedValue: WrappedValue<T> | null;
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

export function selector<V>(getter: () => V): Selector<[], V> {
  let watchedCurrentValue: V;
  let isSettingSelfValue = false;
  const reactionsWatchingThisSelector = new WeakSet<ReactionCallback>();
  let reactionsWatchingThisSelectorCount = 0;

  // const selectorResource = resource(getter);

  let stopFunction: (() => void) | null = null;

  const valueStore = store({
    get value() {
      const runningReaction = getRunningReaction();

      // This selector value is read outside of reaction. There is no need to initialize watching.
      if (!runningReaction) {
        return getter();
      }

      // Some reaction tries to read this value
      if (!isSettingSelfValue) {
        // If it is doing so for the first time - subscribe to when it stops.
        // This is to disable self watching of this selector if noone will subscribe to it anymore.
        if (!reactionsWatchingThisSelector.has(runningReaction)) {
          initializeNewReactionIsListening(runningReaction);
        }
      }

      // If we're not already watching - start watching.
      if (!stopFunction) {
        startWatching();
      }

      // Starting watching will instantly update watched value so we can safely return it.
      return watchedCurrentValue!;
    },
    set value(value: V) {
      if (!isSettingSelfValue) {
        throw new Error('Value of selector cannot be manually changed.');
      }
      watchedCurrentValue = value;
    },
  });

  function initializeNewReactionIsListening(reaction: ReactionCallback) {
    reactionsWatchingThisSelector.add(reaction);
    reactionsWatchingThisSelectorCount++;

    subscribeToReactionStopped(reaction, () => {
      // When some reaction using this selector stops - remove it from list of reactions
      reactionsWatchingThisSelector.delete(reaction);
      reactionsWatchingThisSelectorCount--;

      // If it was the last reaction watching this selector - stop updating selected value
      if (reactionsWatchingThisSelectorCount === 0 && stopFunction) {
        stopFunction();
      }
    });
  }

  function startWatching() {
    if (stopFunction) {
      throw new Error('This selector is already watching');
    }

    // This will avoid infinite loop inside get value of the store.
    // This is because in order to set value, we first have to get it actually
    // eg foo.bar = 2 - before you set the value, you actually access 'bar' first.
    // This causes 'getter' to be called.
    stopFunction = () => {};

    allowNestedWatch(() => {
      stopFunction = watch(
        () => {
          const newValue = getter();
          // Enable setting the value of the selector
          isSettingSelfValue = true;

          // Always schedule selector update in sync way. It will be up to reactions that watch it
          // To schedule themselves in any other way.
          syncEvery(() => {
            valueStore.value = newValue;
          });

          isSettingSelfValue = false;
        },
        { name: 'selectorWatcher' },
      );
    });
  }

  function getSelected() {
    return valueStore.value;
  }

  let currentlySuspended: CurrentlySuspended<V> | null;

  function getSync(): SyncValue<V> {
    const value = valueStore.value;

    if (!(value instanceof Promise)) {
      // Selector is not async - return normally.
      return value as SyncValue<V>;
    }

    // Selector is async. We need to suspend it if needed or return sync value if it's already resolved.

    // Selector was called outside of reaction. As selectors are only keeping their values warm, when
    // they're watched - selector would never actually resolve. Throw and dont continue.

    // TODO: Not sure if it's a good way to go.
    if (!getRunningReaction()) {
      throw new Error(
        'Selector that returns promise can only be called during reaction. If you want to use such selector outside of reaction - call selector.getRaw',
      );
    }

    // This selector did already suspend with current promise
    if (currentlySuspended && currentlySuspended.promise === value) {
      // If it has already resolved - return resolved value.
      if (currentlySuspended.wrappedValue) {
        return currentlySuspended.wrappedValue.value as SyncValue<V>;
      }

      // Suspend again as it is not yet resolved.
      throw value;
    }

    // It is either first call or previously suspenion is outdated.

    // Update currently suspended with this promise and no resolved value yet.
    currentlySuspended = {
      promise: value,
      wrappedValue: null,
    };

    // Wait for promise to resolve and update resolved value instantly.
    value.then(resolvedValue => {
      // Make sure current promise didnt change while promise was resolving.
      // If it happened - do nothing as this promise is already outdated.
      if (currentlySuspended?.promise === value) {
        currentlySuspended.wrappedValue = { value: resolvedValue };
      }
    });

    // Add promise to global list of suspended promises in order to warn user about calling
    // async selector directly outside of suspense-enabled context like Render functions.
    suspendedPromises.add(value);

    // Suspend with promise.
    throw value;
  }

  // @ts-ignore
  getSync.get = (...args: any[]) => {
    console.warn(
      `Calling selector.get is only required on selectorFamily. With single selectors, you can call it directly like selector() instead of selector.get()`,
    );
    // @ts-ignore
    return getSync(...args);
  };

  getSync.getRaw = getSelected;

  return getSync;
}

export interface SelectorFamily<Args extends any[], R> {
  // get: CallbackWithSuspnese<Args, R>;
  get(...args: Args): SyncValue<R>;
  getRaw(...args: Args): R;
}

export function selectorFamily<Args extends any[], R>(
  getter: (...args: Args) => R,
): SelectorFamily<Args, R> {
  const serializedArgsSelectorsMap = new Map<string, Selector<any, any>>();

  function getArgsSelector(...args: Args): Selector<[], R> {
    const serializedArgs = serialize(args);
    if (serializedArgsSelectorsMap.has(serializedArgs)) {
      return serializedArgsSelectorsMap.get(serializedArgs)!;
    }

    const argsSelector = selector(() => {
      return getter(...args);
    });

    serializedArgsSelectorsMap.set(serializedArgs, argsSelector);

    return argsSelector;
  }

  function get(...args: Args): SyncValue<R> {
    return getArgsSelector(...args)();
  }

  function getRaw(...args: Args): R {
    return getArgsSelector(...args).getRaw();
  }

  return {
    get,
    getRaw,
  };
}
