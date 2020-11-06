import { isAsyncReactionCancelledError } from '../async/promiseWrapper';
import { allowNestedWatch, batch, sync } from '../batch';
import {
  getReactionOptions,
  ReactionCallback,
  subscribeToReactionStopped,
} from '../reaction';
import { getRunningReaction } from '../reactionsStack';
import { Resource, singleValueResource } from '../resource';
import { store } from '../store';
import { serialize } from '../utils';
import { watch } from '../watch';
import { Selector, SelectorOptions } from './types';
import { warmingManager, warmSelectors } from './warming';

interface SelectorStore<T> {
  value: T;
  isReady: boolean;
  promise: Promise<T> | null;
}

/**
 * Creates new selector
 */
export function selector<V>(
  getter: () => Promise<V> | V,
  options: SelectorOptions = {},
): Selector<V> {
  const updateStrategy = options.updateStrategy ?? 'silent';
  let resource: Resource<V>;

  const selectorValueStore = store<SelectorStore<V>>({
    // We'll initialize this value on first run, but we don't want to read resource now if this selector
    // is lazy
    value: null as any,
    isReady: false,
    promise: null,
  });

  function initResourceIfNeeded() {
    if (resource) {
      return;
    }

    // We'll warn for eager reactions that reject without being called nor resolved before
    let didResolveAtLeastOnce = false;

    resource = singleValueResource(getter, {
      onStatusChange(status) {
        if (status.state === 'resolved') {
          didResolveAtLeastOnce = true;
          // Update store value skipping schedulers. It will be up to reactions watching this selector to schedule their updates properly.
          batch(() => {
            selectorValueStore.value = status.value;
            selectorValueStore.isReady = true;
            selectorValueStore.promise = null;
          });
        }

        if (status.state === 'updating') {
          batch(() => {
            selectorValueStore.promise = status.promise;
          });
          reactionsWatchingThisSelector.forEach(reaction => {
            getReactionOptions(reaction).onSilentUpdate?.(status.promise);
          });
        }

        if (status.state === 'rejected') {
          if (isAsyncReactionCancelledError(status.error)) {
            resource.restart();
            return;
          }
          // Lazy reactions are not called automatically so their error will be passed to caller.
          if (options.lazy || didResolveAtLeastOnce) {
            return;
          }

          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `Selector rejected before being used with error:`,
              status.error,
            );
          }
        }
      },
    });
  }

  let watching: { stop: () => void } | null = null;

  function startWatchingIfNeeded() {
    if (watching) {
      return;
    }

    startWatching();
  }

  function startWatching() {
    if (watching) {
      throw new Error('Cannot start selector watching if its already watching');
    }
    initResourceIfNeeded();
    const stop = allowNestedWatch(() => {
      return watch(
        () => {
          batch(() => {
            if (updateStrategy === 'reset') {
              resource.restart();
              selectorValueStore.value = null as any;
            } else {
              resource.update();
            }
          });
        },
        { name: 'selectorWatch' },
      );
    });
    watching = { stop };
  }

  // Object of actual selector
  const selectorWrapper: Selector<V> = {
    get isReady() {
      initResourceIfNeeded();
      warmSelectors(selectorWrapper);

      return selectorValueStore.isReady;
    },
    // value is readonly. When user tries to get it - it'll initialize resource and watching if needed.
    // it might also suspend.
    get value() {
      initResourceIfNeeded();

      const runningReaction = getRunningReaction();

      // If all of below conditions are true, we dont have to watch:
      if (
        // It cannot be already watching
        !watching &&
        // must be lazy
        options.lazy &&
        // It is not called inside other reaction
        !runningReaction &&
        // It is not requested to warm this selector.
        // If we're warming lazy selector - it will become warm until something starts to watch it and then stops.
        !warmingManager.isRunning()
      ) {
        // Read from resource. It might suspend.
        resource.read();
        // Now we return value from the store. It is synced with resource because of onResolved callback
        // Added to resource that will instantly update store value before doing anything else after resolving
        return selectorValueStore.value;
      }

      // We'll read selected value with watching.
      startWatchingIfNeeded();

      // If this selector is lazy - watch if it is accessed during some other reaction.
      // If this is the case - we'll stop this selector watcher when all watching reactions that
      // access this reaction will stop.
      if (runningReaction) {
        handleNewReaction(runningReaction);
      }

      // Read resource in order to suspend it or throw if there is some error inside of it.
      resource.read();

      // Now we return value from the store. It is synced with resource because of onResolved callback
      // Added to resource that will instantly update store value before doing anything else after resolving
      return selectorValueStore.value;
    },
    // Selector value is readonly. Let's add setter to show proper error message.
    set value(value: V) {
      throw new Error(`You cannot manually change the value of the selector.`);
    },
    get promise() {
      return resource.promise();
    },
  };

  // If selector is not lazy - start watching instantly during creation.
  if (!options.lazy) {
    startWatchingIfNeeded();

    // Resource is already created by start watching.
    const status = resource!.getStatus();

    // If getter of the selector itself returned error - throw it and don't create selector
    if (status.state === 'getterError') {
      throw status.error;
    }
  }

  // In this section we're allowing lazy selector to stop itself if nothing is watching it anymore
  const reactionsWatchingThisSelector = new Set<ReactionCallback>();

  function handleNewReaction(reaction: ReactionCallback) {
    // We've already did it for this reaction
    if (reactionsWatchingThisSelector.has(reaction)) {
      return;
    }

    // Register this reaction as watching this selector
    reactionsWatchingThisSelector.add(reaction);

    if (!options.lazy) {
      return;
    }

    // Add stop subscriber to this reaction
    subscribeToReactionStopped(reaction, () => {
      // Selector is already stopped. Do nothing.
      // Note such case should never happen as selector should not be stopped if something was watching it.
      if (!watching) {
        return;
      }
      // Remove reaction from list of selector watchers
      reactionsWatchingThisSelector.delete(reaction);

      // If it was the last reaction watching this selector - stop updating selected value
      if (reactionsWatchingThisSelector.size === 0) {
        watching.stop();
        watching = null;
      }
    });
  }

  return selectorWrapper;
}

export type SelectorFamily<Args extends any[], R> = (
  ...args: Args
) => Selector<R>;

export function selectorFamily<Args extends any[], R>(
  getter: (...args: Args) => R | Promise<R>,
  options?: SelectorOptions,
): SelectorFamily<Args, R> {
  const serializedArgsSelectorsMap = new Map<string, Selector<R>>();

  function getArgsSelector(...args: Args): Selector<R> {
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

  function get(...args: Args): Selector<R> {
    return getArgsSelector(...args);
  }

  function unwrap() {
    return function getRaw(...args: Args): R {
      return get(...args).value;
    };
  }

  return get;
}
