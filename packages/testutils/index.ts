import { nextTick } from 'process';
import { ReactElement } from 'react';
import ReactTestRenderer, { act, create } from 'react-test-renderer';
import { allowInternal, sync, waitForSchedulersToFlush } from 'statek';

type Callback<T> = (value: T) => void;

export function wait(time: number = 0) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export function _logger(name: string) {
  return function log(...args: any[]) {
    console.info(`ℹ️  ${name} >>>`, ...args);
  };
}

export async function awaitSuspended<R>(
  callback: () => R,
  depth = 0,
): Promise<R> {
  if (depth > 5) {
    throw new Error('Await suspended has 5 levels depth. Assuming error');
  }
  try {
    return callback();
  } catch (error) {
    if (error instanceof Promise) {
      // console.error({ error });
      try {
        await error;
        return await awaitSuspended(callback, depth + 1);
      } catch (error) {
        throw error;
      }
    }

    throw error;
  }
}

let promiseId = 0;

export function waitNextTick() {
  return new Promise<void>(resolve => {
    process.nextTick(resolve);
  });
}

export function manualPromise<T = string>() {
  promiseId++;
  let _resolve: any;
  let _reject: any;

  const promise = new Promise<T>((resolve, reject) => {
    _resolve = async (value: T) => {
      await act(async () => {
        await resolve(value);
        await wait(1);
        await allowInternal(() => waitForSchedulersToFlush());
      });
    };
    _reject = reject;
  });

  // @ts-ignore
  promise._pid = promiseId;

  return [promise, _resolve, _reject] as const;
}

export function repeatingPromise<T = string>() {
  function reset() {
    const [promise, resolve, reject] = manualPromise<T>();
    info.promise = promise;
    info.resolve = resolve;
    info.reject = reject;
  }

  const [initialPromise, initialResolve, initialReject] = manualPromise<T>();

  const info = {
    promise: initialPromise,
    resolve: initialResolve,
    reject: initialReject,
    reset,
  };

  return info;

  // return info;
}

export function manualPromiseFactory<T>() {
  let _resolveLast: (value: T) => Promise<void> = async () => {};
  let _rejectLast: (value: T) => void = () => {};

  function next() {
    const [nextPromise, nextResolve, nextReject] = manualPromise<T>();

    _resolveLast = nextResolve;
    _rejectLast = nextReject;

    return nextPromise;
  }

  return [next, _resolveLast!, _rejectLast!] as const;
}

let consoleSpies = new Set<jest.SpyInstance>();

afterEach(() => {
  consoleSpies.forEach(spy => {
    spy.mockRestore();
  });
});

export function watchWarn() {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

  consoleSpies.add(warnSpy);

  function getLastCall() {
    return warnSpy.mock.calls[warnSpy.mock.calls.length - 1];
  }

  function getLast(): any[] | null {
    return getLastCall() ?? null;
  }

  function count() {
    return warnSpy.mock.calls.length;
  }

  return {
    getLast,
    count,
  };
}

export function actSync(callback: () => void) {
  let result;
  act(() => {
    result = sync(() => callback());
  });

  return result;
}

export function render(node: ReactElement) {
  return ReactTestRenderer.create(node);
}

export function itRenders(description: string, callback: () => any) {
  it(description, async () => {
    await sync(() => callback());
  });
}

export function expectContent(
  r: ReactTestRenderer.ReactTestRenderer,
  content: any,
) {
  expect(r.toJSON()).toEqual(content);
}
