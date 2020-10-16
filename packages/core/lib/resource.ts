import { serialize } from './utils';

export type WrappedValue<T> = {
  value: T;
};

export type ResourceValue<T> = {
  promise: Promise<T>;
  wrappedValue: WrappedValue<T> | null;
};

export type SyncValue<T> = T extends Promise<infer U> ? U : T;

export type Resource<Args extends any[], R> = ((
  ...args: Args
) => SyncValue<R>) & {
  getRaw(...args: Args): R;
};

function isResourceValue(input: any): input is ResourceValue<any> {
  return input && input.promise;
}

export function resource<Args extends any[], R>(
  getter: (...args: Args) => R,
): Resource<Args, R> {
  const serializedArgsSelectorsMap = new Map<string, ResourceValue<R>>();

  function createValue(promise: Promise<any>): ResourceValue<R> {
    return {
      promise,
      wrappedValue: null,
    };
  }

  function getResourceValue(...args: Args): ResourceValue<R> | R {
    const serializedArgs = serialize(args);
    if (serializedArgsSelectorsMap.has(serializedArgs)) {
      return serializedArgsSelectorsMap.get(serializedArgs)!;
    }

    const valueOrPromise = getter(...args);

    if (!(valueOrPromise instanceof Promise)) {
      return valueOrPromise;
    }
    const resourceValue = createValue(valueOrPromise);

    serializedArgsSelectorsMap.set(serializedArgs, resourceValue);

    return resourceValue;
  }

  function getOrSuspend(value: ResourceValue<R>): SyncValue<R> {
    if (!value.wrappedValue) {
      throw value.promise;
    }

    return value.wrappedValue.value as SyncValue<R>;
  }

  function get(...args: Args): SyncValue<R> {
    const resourceValue = getResourceValue(...args);

    if (isResourceValue(resourceValue)) {
      return getOrSuspend(resourceValue);
    }

    return resourceValue as SyncValue<R>;
  }

  function getRaw(...args: Args): R {
    return getter(...args);
  }

  get.getRaw = getRaw;

  return get;
}
