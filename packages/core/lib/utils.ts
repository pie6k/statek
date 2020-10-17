import { dontWatch } from './batch';

export function typedOwnPropertyNames<T>(obj: T): Array<keyof T> {
  return Object.getOwnPropertyNames(obj) as Array<keyof T>;
}

export function removeArrayElement<T>(array: T[], item: T) {
  const index = array.indexOf(item);
  if (index === -1) {
    return;
  }

  array.splice(index, 1);
}

export function isSymbol(t: any): t is Symbol {
  return typeof t === 'symbol';
}

export function isPrimitive(input: any) {
  return input !== Object(input);
}

function isPlainObject(input: any) {
  return Object.prototype.toString.call(input) === '[object Object]';
}

export function noop() {}

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

export function createStackCallback<Data = any>(onFinish: () => void) {
  const callsStack: Array<Data | null> = [];
  let isEnabled = true;

  function perform<A extends any[], R>(
    this: any,
    fn: (...args: A) => R,
    args?: A,
    data?: Data,
  ): R {
    callsStack.push(data ?? null);

    try {
      return fn.apply(this, args!);
    } finally {
      callsStack.pop();

      onFinish();
    }
  }

  function isRunning() {
    return callsStack.length > 0;
  }

  function getCurrentData(): Data | null {
    return callsStack[callsStack.length - 1] ?? null;
  }

  const manager = {
    isRunning,
    getCurrentData,
  };

  return [perform, manager] as const;
}

const serializationCache = new WeakMap<any, string>();

export function serialize(input: any): string {
  if (!isPlainObject(input) && serializationCache.has(input)) {
    return serializationCache.get(input)!;
  }

  // Make sure input can be safely serialized without resulting with same output for different input.
  if (process.env.NODE_ENV !== 'production' && !isSerializable(input)) {
    throw new Error('It is not possible to serialize provided value');
  }

  // Dont watch input during serialization!
  return JSON.stringify(dontWatch(() => input));
}

function isShallowSerializable(value: any): boolean {
  return (
    typeof value === 'undefined' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    Array.isArray(value) ||
    isPlainObject(value)
  );
}

function isSerializable(value: any): boolean {
  let isNestedSerializable;
  if (!isShallowSerializable(value)) {
    return false;
  }
  for (let property in value) {
    if (value.hasOwnProperty(property)) {
      if (!isShallowSerializable(value[property])) {
        return false;
      }
      if (typeof value[property] == 'object') {
        isNestedSerializable = isSerializable(value[property]);
        if (!isNestedSerializable) {
          return false;
        }
      }
    }
  }
  return true;
}
