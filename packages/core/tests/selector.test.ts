import {
  isStore,
  store,
  watch,
  getStoreRaw,
  selector,
  manualWatch,
} from '@statek/core/lib';

describe('selector', () => {
  it('should only run selector watch if its value changed', () => {
    const obs = store({ foo: 1 });
    const getIsBig = selector(() => obs.foo > 2);

    const spy = jest.fn(() => {
      return getIsBig();
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

  it('should not initialize watching if running without reaction', () => {
    const obs = store({ foo: 1 });
    const selectorFn = jest.fn(() => obs.foo > 2);
    const getIsBig = selector(selectorFn);

    expect(selectorFn).toBeCalledTimes(0);

    getIsBig();

    expect(selectorFn).toBeCalledTimes(1);

    obs.foo = 5;

    expect(selectorFn).toBeCalledTimes(1);
  });

  it('should not call selector function if value is not requested', () => {
    const obs = store({ foo: 1 });
    const selectorFn = jest.fn(() => obs.foo > 2);
    const getIsBig = selector(selectorFn);

    // value was never requested - selector is lazy
    expect(selectorFn).toBeCalledTimes(0);

    const watchSpy = jest.fn(() => {
      return getIsBig();
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

  it('should not call selector twice if its part of watch but has no changed input', () => {
    const s = store({ foo: 1, bar: 1 });
    const spy = jest.fn();
    const sel = selector(() => {
      spy();
      return s.foo;
    });

    watch(() => {
      sel();
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
      sel();
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
    const getIsBig = selector(selectorFn);

    let promise: any = null;

    const getWatched = manualWatch(() => {
      return getIsBig();
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
