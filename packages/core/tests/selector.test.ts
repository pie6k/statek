import {
  isStore,
  store,
  watch,
  getStoreRaw,
  selector,
  manualWatch,
} from '@statek/core/lib';
import { awaitSuspended, manualPromise, watchWarn } from './utils';

describe('selector', () => {
  it('should only run selector watch if its value changed', () => {
    const obs = store({ foo: 1 });
    const isBig = selector(() => {
      return obs.foo > 2;
    });

    const spy = jest.fn(() => {
      return isBig.value;
    });

    watch(spy);

    expect(spy).toBeCalledTimes(1);
    expect(spy).toHaveLastReturnedWith(false);

    obs.foo++;

    expect(spy).toBeCalledTimes(1);

    obs.foo++;
    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveLastReturnedWith(true);
  });

  it('should not call selector twice if its part of watch but has no changed input', () => {
    const s = store({ foo: 1, bar: 1 });
    const spy = jest.fn();
    const sel = selector(() => {
      spy();
      return s.foo;
    });

    watch(() => {
      sel.value;
      s.bar;
    });

    s.bar++;

    expect(spy).toBeCalledTimes(1);
  });

  it('should not call selector twice if called from manualWatch', () => {
    const s = store({ foo: 1, bar: 1 });
    const spy = jest.fn();
    const sel = selector(() => {
      spy();
      return s.foo;
    });

    const call = manualWatch(() => {
      sel.value;
      s.bar;
    });

    call();
    call();

    expect(spy).toBeCalledTimes(1);
  });
});

describe('selector - async', () => {
  it('should suspend async selector if used', async () => {
    const selectorFn = jest.fn(async () => 'foo');
    const isBig = selector(selectorFn);

    let promise: any = null;

    const getWatched = manualWatch(() => {
      return isBig.value;
    });

    expect(() => {
      try {
        getWatched();
      } catch (error) {
        promise = error;
        throw error;
      }
    }).toThrow(Promise);

    await promise;

    expect(getWatched()).toEqual('foo');
  });
});

describe('selector - lazy', () => {
  it('should not initialize watching if running without reaction', () => {
    const obs = store({ foo: 1 });
    const selectorFn = jest.fn(() => obs.foo > 2);
    const isBig = selector(selectorFn, { lazy: true });

    expect(selectorFn).toBeCalledTimes(0);

    isBig.value;

    expect(selectorFn).toBeCalledTimes(1);

    obs.foo = 5;

    expect(selectorFn).toBeCalledTimes(1);
  });

  it('should not call selector function if value is not requested', () => {
    const obs = store({ foo: 1 });
    const selectorFn = jest.fn(() => obs.foo > 2);
    const isBig = selector(selectorFn, { lazy: true });

    // value was never requested - selector is lazy
    expect(selectorFn).toBeCalledTimes(0);

    const watchSpy = jest.fn(() => {
      return isBig.value;
    });

    const stopWatch = watch(watchSpy, { name: 'watchSpy' });

    expect(watchSpy).toBeCalledTimes(1);
    expect(selectorFn).toBeCalledTimes(1);

    obs.foo++;

    // selector value is still the same
    expect(watchSpy).toBeCalledTimes(1);
    expect(selectorFn).toBeCalledTimes(2);

    obs.foo++;

    // is big switched to true
    expect(watchSpy).toBeCalledTimes(2);
    expect(selectorFn).toBeCalledTimes(3);

    stopWatch();

    obs.foo++;

    expect(selectorFn).toBeCalledTimes(3);
  });

  it('should still watch if only part of watching reaction stops', () => {
    const obs = store({ foo: 1 });
    const selectorFn = jest.fn(() => obs.foo > 2);
    const isBig = selector(selectorFn, { lazy: true });

    const stopWatch = watch(() => isBig.value, { name: 'watchSpy' });
    const stopWatch2 = watch(() => isBig.value, { name: 'watchSpy' });

    expect(selectorFn).toBeCalledTimes(1);

    obs.foo++;

    expect(selectorFn).toBeCalledTimes(2);

    stopWatch();
    obs.foo++;

    expect(selectorFn).toBeCalledTimes(3);

    stopWatch2();

    obs.foo++;

    expect(selectorFn).toBeCalledTimes(3);
  });

  it('should restore watching after it has stopped', () => {
    const obs = store({ foo: 1 });
    const selectorFn = jest.fn(() => obs.foo > 2);
    const isBig = selector(selectorFn, { lazy: true });

    let stopWatch = watch(() => isBig.value);

    expect(selectorFn).toBeCalledTimes(1);

    obs.foo++;

    expect(selectorFn).toBeCalledTimes(2);

    stopWatch();
    obs.foo++;

    expect(selectorFn).toBeCalledTimes(2);

    stopWatch = watch(() => isBig.value);

    expect(selectorFn).toBeCalledTimes(3);
    obs.foo++;

    expect(selectorFn).toBeCalledTimes(4);
  });
});

describe('selector - errors', () => {
  it('should throw instantly if non lazy selector has errors', () => {
    const error = new Error('foo');

    expect(() => {
      selector(() => {
        throw error;
      });
    }).toThrow(error);
  });
  it('should throw original error that happens inside lazy selector when trying to get value', () => {
    const error = new Error('foo');

    const isBig = selector(
      () => {
        throw error;
      },
      { lazy: true },
    );

    expect(() => {
      isBig.value;
    }).toThrow(error);

    expect(() => {
      watch(() => isBig.value);
    }).toThrow(error);
  });

  it('should warn about async error in non lazy mode', async () => {
    const error = new Error('foo');

    const [badAsync, _, reject] = manualPromise<string>();

    const warn = watchWarn();

    selector(() => badAsync);

    reject(error);

    await expect(badAsync).rejects.toEqual(error);

    expect(warn.getLast()).toEqual([
      'Selector rejected before being used with error:',
      error,
    ]);
  });

  it('should throw original error if requested value', async () => {
    const error = new Error('foo');

    const [badAsync, _, reject] = manualPromise<string>();

    const sel = selector(() => badAsync, { lazy: true });

    reject(error);

    await expect(awaitSuspended(() => sel.value)).rejects.toEqual(error);
  });
});
