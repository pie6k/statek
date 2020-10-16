import { serialize } from './utils';

export type SyncValue<T> = T extends Promise<infer U> ? U : T;

export type Resource<T> = {
  read(): SyncValue<T>;
  forceUpdate(): void;
  getStatus(): ResourceStatus<SyncValue<T>>;
};

export type ResourceStatus<T> =
  | { state: 'unstarted' }
  | { state: 'pending'; promise: Promise<T> }
  | { state: 'resolved'; value: T }
  | { state: 'rejected'; error: any }
  | { state: 'getterError'; error: any };

interface ResourceOptions<T> {
  onResolved?: (value: SyncValue<T>) => void;
  onRejected?: (error: any) => void;
  lazy?: boolean;
}

export function singleValueResource<T>(
  getter: () => T,
  options?: ResourceOptions<T>,
): Resource<T> {
  let status: ResourceStatus<SyncValue<T>> = { state: 'unstarted' };

  function getStatus() {
    return status;
  }

  function resolve(value: SyncValue<T>) {
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

    let getterResult: T;
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
      return resolve(getterResult as SyncValue<T>);
    }

    // Resource is a promise.
    status = {
      state: 'pending',
      promise: getterResult,
    };

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

  function read(): SyncValue<T> {
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

  return {
    read,
    getStatus,
    forceUpdate,
  };
}

export type ResourceFamily<Args extends any[], R> = {
  read(...args: Args): SyncValue<R>;
};

export function resourceFamily<Args extends any[], R>(
  getter: (...args: Args) => R,
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

  function read(...args: Args): SyncValue<R> {
    const resourceValue = getSingleResource(...args);

    return resourceValue.read();
  }

  return {
    read,
  };
}
