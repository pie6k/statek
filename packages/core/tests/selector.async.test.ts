import {
  isStore,
  store,
  watch,
  getStoreRaw,
  selector,
  manualWatch,
} from '@statek/core/lib';
import { manualPromise } from './utils';

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

  it('async selectors should properly wrap observables', async () => {
    const s = store({ foo: { bar: 2 } });
    const selectorFn = jest.fn(async () => s.foo);
    const sel = selector(selectorFn);

    const resolve = manualWatch(() => {
      return sel.getRaw();
    });

    const resolved = await resolve();

    expect(isStore(resolved)).toBe(true);
  });

  it('async selectors can be used in watch sync-like', async () => {
    const [promise, resolve] = manualPromise<string>();
    const sel = selector(() => promise);

    const watchSpy = jest.fn(() => {
      return sel();
    });

    watch(watchSpy);

    expect(watchSpy).toReturnTimes(0);
    expect(watchSpy).toBeCalledTimes(1);

    resolve('foo');

    expect(watchSpy).toReturnTimes(1);

    expect(watchSpy).toHaveLastReturnedWith('foo');
  });
});
