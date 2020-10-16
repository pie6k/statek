type Callback<T> = (value: T) => void;

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
    _resolve = resolve;
    _reject = reject;
  });

  // @ts-ignore
  promise._pid = promiseId;

  return [promise, _resolve, _reject] as const;
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
