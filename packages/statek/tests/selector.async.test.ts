import {
  isStore,
  store,
  watch,
  getStoreRaw,
  selector,
  manualWatch,
} from 'statek';
import { awaitSuspended, manualPromise } from './utils';

describe('selector - async', () => {
  it('should suspend async selector if used', async () => {
    const selectorFn = jest.fn(async () => 'foo');
    const isBig = selector(selectorFn);

    const getWatched = manualWatch(() => {
      return isBig.value;
    });

    const suspendedValue = await awaitSuspended(() => getWatched());

    expect(suspendedValue).toEqual('foo');
  });

  it('async selectors should properly wrap observables', async () => {
    const s = store({ foo: { bar: 2 } });

    const selectorFn = jest.fn(async () => s.foo);
    const sel = selector(selectorFn);

    const suspendedCall = manualWatch(() => {
      return sel.value;
    });

    const nestedObsFromSuspense = await awaitSuspended(() => suspendedCall());

    expect(isStore(nestedObsFromSuspense)).toBe(true);
  });

  it('async selectors can be used in watch sync-like', async () => {
    const [promise, resolve] = manualPromise<string>();
    const sel = selector(() => promise);

    const watchSpy = jest.fn(() => {
      return sel.value;
    });

    watch(watchSpy);

    expect(watchSpy).toReturnTimes(0);
    expect(watchSpy).toBeCalledTimes(1);

    await resolve('foo');

    expect(watchSpy).toReturnTimes(1);

    expect(watchSpy).toHaveLastReturnedWith('foo');
  });
});
