type Callback<T> = (value: T) => void;

export function manualPromise<T>() {
  const listeners = new Set<Callback<T>>();

  const promise = new Promise<T>(() => {});

  function then(callback: Callback<T>) {
    listeners.add(callback);
  }

  // @ts-ignore
  promise.then = then;

  function resolve(value: T) {
    listeners.forEach(listener => {
      listener(value);
    });
  }

  return [(promise as any) as Promise<T>, resolve] as const;
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

  function getLast(): string | null {
    return getLastCall()?.[0] ?? null;
  }

  function count() {
    return warnSpy.mock.calls.length;
  }

  return {
    getLast,
    count,
  };
}
