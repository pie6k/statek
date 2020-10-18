import { serialize } from './utils';

export type SyncValue<T> = T extends Promise<infer U> ? U : T;
export type AsyncValue<T> = Promise<SyncValue<T>>;

export type Resource<T> = {
  read(): T;
  promise(): Promise<T>;
  forceUpdate(): void;
  getStatus(): ResourceStatus<T>;
};

export type ResourceStatus<T> =
  | { state: 'unstarted' }
  | { state: 'pending'; promise: Promise<T> }
  | { state: 'resolved'; value: T }
  | { state: 'rejected'; error: any }
  | { state: 'getterError'; error: any };

interface ResourceOptions<T> {
  onResolved?: (value: T) => void;
  onRejected?: (error: any) => void;
  lazy?: boolean;
}

type InputResult<T> = Promise<T> | T;

const resourcePromises = new WeakSet<Promise<any>>();

export function isResourcePromise(promise: Promise<any>) {
  return resourcePromises.has(promise);
}

export function singleValueResource<T>(
  getter: () => InputResult<T>,
  options?: ResourceOptions<T>,
): Resource<T> {
  let status: ResourceStatus<T> = { state: 'unstarted' };

  function getStatus() {
    return status;
  }

  function resolve(value: T) {
    status = {
      state: 'resolved',
      value,
    };

    options?.onResolved?.(value);

    return value;
  }

  function forceUpdate() {
    status = { state: 'unstarted' };
    try {
      getInitial();
    } catch (error) {}
  }

  function getInitial() {
    if (status.state !== 'unstarted') {
      throw new Error('Cannot initialize resource twice');
    }

    let getterResult: InputResult<T>;
    // Make sure getter error itself is handled
    try {
      getterResult = getter();
    } catch (error) {
      // getter() function thrown. Mark as rejected
      status = {
        state: 'getterError',
        error,
      };

      throw error;
    }

    // Resource is sync. Result instantly and mark as resolved.
    if (!(getterResult instanceof Promise)) {
      return resolve(getterResult);
    }

    // Resource is a promise.
    status = {
      state: 'pending',
      promise: getterResult,
    };

    resourcePromises.add(getterResult);

    // Wait for promise to resolve and instantly update state.
    getterResult
      .then(value => {
        resolve(value);
      })
      .catch(resolveError => {
        status = {
          state: 'rejected',
          error: resolveError,
        };
        options?.onRejected?.(resolveError);
      });

    // Suspend with promise.
    throw getterResult;
  }

  function read(): T {
    if (status.state === 'pending') {
      throw status.promise;
    }

    if (status.state === 'resolved') {
      return status.value;
    }

    if (status.state === 'rejected') {
      throw status.error;
    }

    if (status.state === 'getterError') {
      throw status.error;
    }

    if (status.state === 'unstarted') {
      return getInitial();
    }

    throw new Error('Invalid resource state');
  }

  async function promise(): Promise<T> {
    try {
      const value = read();
      return value;
    } catch (error) {
      const status = getStatus();

      if (status.state === 'pending') {
        return status.promise;
      }

      if (status.state === 'rejected') {
        throw status.error;
      }

      throw error;
    }
  }

  return {
    read,
    getStatus,
    forceUpdate,
    promise,
  };
}

export type ResourceFamily<Args extends any[], R> = {
  read(...args: Args): R;
};

export function resourceFamily<Args extends any[], R>(
  getter: (...args: Args) => Promise<R> | R,
): ResourceFamily<Args, R> {
  const serializedArgsSelectorsMap = new Map<string, Resource<R>>();

  function getSingleResource(...args: Args): Resource<R> {
    const serializedArgs = serialize(args);
    if (serializedArgsSelectorsMap.has(serializedArgs)) {
      return serializedArgsSelectorsMap.get(serializedArgs)!;
    }

    const singleResource = singleValueResource(() => getter(...args));

    serializedArgsSelectorsMap.set(serializedArgs, singleResource);

    return singleResource;
  }

  function read(...args: Args): R {
    const resourceValue = getSingleResource(...args);

    return resourceValue.read();
  }

  return {
    read,
  };
}
