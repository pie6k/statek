import { allowNestedWatch, dontWatch, syncEvery } from './batch';
import { ReactionCallback, subscribeToReactionStopped } from './reaction';
import { getRunningReaction } from './reactionsStack';
import { singleValueResource, Resource } from './resource';
import { store } from './store';
import { addReactionPendingPromise } from './suspense';
import { createStackCallback, noop, serialize } from './utils';
import { manualWatch, watch } from './watch';

export type SyncValue<T> = T extends Promise<infer U> ? U : T;

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

export interface Selector<T> {
  readonly value: SyncValue<T>;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export interface SelectorOptions {
  lazy?: boolean;
}

export function selector<V>(
  getter: () => V,
  options: SelectorOptions = {},
): Selector<V> {
  let resource: Resource<V>;

  const selectorValueStore = store<Writeable<Selector<V>>>({
    // We'll initialize this value on first run, but we don't want to read resource now if this selector
    // is lazy
    value: null as any,
  });

  function initResourceIfNeeded() {
    if (resource) {
      return;
    }

    // We'll warn for eager reactions that reject without being called nor resolved before
    let didResolveAtLeastOnce = false;

    resource = singleValueResource(getter, {
      // Each time resource value is resolved - instantly set it as selector store value.
      onResolved(newValue) {
        didResolveAtLeastOnce = true;
        selectorValueStore.value = newValue;
      },
      onRejected(error) {
        // Lazy reactions are not called automatically so their error will be passed to caller.
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
          resource.forceUpdate();
        },
        { name: 'selectorWatch' },
      );
    });
    watching = { stop };
  }

  // Object of actual selector
  const selectorWrapper: Selector<V> = {
    // value is readonly. When user tries to get it - it'll initialize resource and watching if needed.
    // it might also suspend.
    get value() {
      initResourceIfNeeded();

      const runningReaction = getRunningReaction();

      // If all of below conditions are true, we dont have to watch:
      if (
        // It cannot be already watching
        !watching &&
        // Option must be lazy
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
      if (options.lazy && runningReaction) {
        planStoppingSelectorWhenNotUsedAnymore(runningReaction);
      }

      // Read resource in order to suspend it or throw if there is some error inside of it.
      resource.read();

      // Now we return value from the store. It is synced with resource because of onResolved callback
      // Added to resource that will instantly update store value before doing anything else after resolving
      return selectorValueStore.value;
    },
    // Selector value is readonly. Let's add setter to show proper error message.
    set value(value: SyncValue<V>) {
      throw new Error(`You cannot manually change the value of the selector.`);
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

  function planStoppingSelectorWhenNotUsedAnymore(reaction: ReactionCallback) {
    // We've already did it for this reaction
    if (reactionsWatchingThisSelector.has(reaction)) {
      return;
    }

    // Register this reaction as watching this selector
    reactionsWatchingThisSelector.add(reaction);

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
  getter: (...args: Args) => R,
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

  return get;
}

const [warming, warmingManager] = createStackCallback(noop);

export function warmSelectors(...selectors: Selector<any>[]) {
  const runningReaction = getRunningReaction();

  warming(() => {
    selectors.forEach(selector => {
      try {
        selector.value;
      } catch (errorOrPromise) {
        // Selectors might suspend during warming, but we still want to warm all of them.
        // We're however adding all pending promises to this reaction to be able to wait for them all before
        // re-running if it will be set this way in reaction settings
        if (runningReaction && errorOrPromise instanceof Promise) {
          addReactionPendingPromise(runningReaction, errorOrPromise);
        }

        // We're also not throwing their errors as they would be thrown anyway as soon as value of some
        // rejected selector is read.
      }
    });
  });
}
