import { canWrapInProxy } from './proxy';
import { ReactionCallback } from './reaction';
import { getStoreRaw, isStore } from './store';
import { createStackCallback, noop } from './utils';
export type ReactionScheduler = (
  reaction: ReactionCallback,
) => Promise<void> | void;

interface DontWatchConfig {
  ignoreMutationWarning?: boolean;
}

/**
 * Escape from watching store access.
 *
 * It can be called inside part of `watch` callback and such read access will not be registered.
 */
export const [_dontWatch, dontWatchManager] = createStackCallback<
  DontWatchConfig
>(noop);

export const dontWatchList = new WeakSet<object>();

/**
 * Will not watch any read operations during provided callback
 *
 * Note: Object read from the store during the callback will not be observable!
 */
export function dontWatch<C extends (() => any) | object>(
  callbackOrObject: C,
  config?: DontWatchConfig,
): C extends () => infer R ? R : () => {} {
  if (typeof callbackOrObject === 'function') {
    // make sure to unwrap direct result of the callback eg dontWatch(() => store); - should return store raw object
    const result = _dontWatch(callbackOrObject as () => any, [], config);

    if (isStore(result)) {
      return getStoreRaw(result as any);
    }

    return result;
  }

  if (isStore(callbackOrObject)) {
    throw new Error(
      'Provided input is store already so cannot stop watching it',
    );
  }

  if (canWrapInProxy(callbackOrObject) !== true) {
    throw new Error('Input provided to dont watch must be object');
  }

  dontWatchList.add(callbackOrObject);

  return function cancel() {
    dontWatchList.delete(callbackOrObject);
  } as any;
}

export const [allowNestedWatch, allowNestedWatchManager] = createStackCallback(
  noop,
);

const e = dontWatch({});
