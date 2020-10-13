import { isStore } from './observable';
import { ReactionCallback } from './reaction';

// try to find the global object
// it is window in the DOM and global in NodeJS and React Native
const isDOM = typeof window !== 'undefined';
const isNative = typeof global !== 'undefined';

export const globalObj: typeof globalThis = (isDOM
  ? window
  : isNative
  ? global
  : undefined) as any;

export function typedOwnPropertyNames<T>(obj: T): Array<keyof T> {
  return Object.getOwnPropertyNames(obj) as Array<keyof T>;
}

export function isSymbol(t: any): t is Symbol {
  return typeof t === 'symbol';
}

export function mapGetOrCreate<K, V>(
  map: Map<K, V> | (K extends object ? WeakMap<K, V> : never),
  key: K,
  value: () => V,
): V {
  if (map.has(key)) {
    return map.get(key)!;
  }

  const newValue = value();

  map.set(key, newValue);

  return newValue;
}

export function createAutomaticReactionsBatcher(
  flusher: (reactions: ReactionCallback[]) => void,
) {
  return {
    add() {},
  };
}

export function isPrimitive(input: any) {
  return input !== Object(input);
}

function isPlainObject(input: any) {
  return Object.prototype.toString.call(input) === '[object Object]';
}

type PrimitiveIterable =
  | Map<any, any>
  | Set<any>
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

const iterables = [
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
];

function isPrimiviteIterable(input: any): input is PrimitiveIterable {
  for (const type of iterables) {
    if (input instanceof type) {
      return true;
    }
  }
  return false;
}

export function noop() {}

/**
 * Will access each deep prop of any input to mark it as read.
 */
export function deepRead(input: any) {
  // there is no point in accessing input that is not observable, as read operations would not
  // be recorded anyway.
  if (!isStore(input)) {
    return;
  }

  if (isPlainObject(input)) {
    for (const key in input) {
      deepRead(input[key]);
    }
  }

  if (Array.isArray(input)) {
    input.forEach(deepRead);
  }

  if (input instanceof Set) {
    input.forEach(deepRead);
  }

  if (input instanceof Map) {
    input.forEach(deepRead);
  }
}

export function appendSet<T>(set: Set<T>, setToAppend?: Set<T>) {
  if (!setToAppend) {
    return;
  }
  setToAppend.forEach(item => {
    set.add(item);
  });
}

export type ThunkFunction<T> = () => T;

export type Thunk<T> = T | (() => T);

export function resolveThunk<T>(
  thunk: Thunk<T>,
  callback?: (thunkFunction: ThunkFunction<T>) => T,
): T {
  if (
    typeof thunk === 'function' &&
    Object.getPrototypeOf(thunk) === Function.prototype
  ) {
    if (callback) {
      return callback(thunk as any);
    }

    return (thunk as any)();
  }

  return thunk as T;
}
