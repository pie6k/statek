import {
  isStore,
  store,
  watch,
  getStoreRaw,
  selector,
  manualWatch,
  createAsyncScheduler,
  waitForSchedulersToFlush,
  allowInternal,
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

  it('should update its value when using used on async scheduler and deps change before flushed', async () => {
    const [promise, resolve] = manualPromise<string>();
    const [schedulerPromise, resolveScheduler] = manualPromise<string>();
    const s = store({ foo: 1, bar: 1 });

    const schedulerSpy = jest.fn(async task => {
      await schedulerPromise;
      task();
    });

    const scheduler = createAsyncScheduler(schedulerSpy);

    const sel = selector(async () => {
      s.foo;
      await promise;
      return s.bar;
    });

    const watchSpy = jest.fn(() => {
      return sel.value;
    });

    watch(watchSpy, { scheduler });

    expect(watchSpy).toReturnTimes(0);
    expect(watchSpy).toBeCalledTimes(1);

    await resolve('foo');
    // await waitForSchedulersToFlush();

    expect(watchSpy).toReturnTimes(0);
    expect(watchSpy).toBeCalledTimes(1);

    await resolveScheduler();
    await allowInternal(() => waitForSchedulersToFlush());

    // expect(schedulerSpy).toBeCalledTimes(1);

    expect(watchSpy).toHaveLastReturnedWith(1);
  });

  it('should update its value when using used on async scheduler and deps change before flushed', async () => {
    const [promise, resolve] = manualPromise<string>();
    const [schedulerPromise, resolveScheduler] = manualPromise<string>();
    const s = store({ foo: 1, bar: 1 });

    const schedulerSpy = jest.fn(async task => {
      await schedulerPromise;
      task();
    });

    const scheduler = createAsyncScheduler(schedulerSpy);

    const sel = selector(async () => {
      const foo = s.foo;
      await promise;
      return s.bar + foo;
    });

    const watchSpy = jest.fn(() => {
      return sel.value;
    });

    watch(watchSpy, { scheduler });

    expect(watchSpy).toReturnTimes(0);
    expect(watchSpy).toBeCalledTimes(1);

    s.foo++;

    await resolve('foo');
    // await waitForSchedulersToFlush();

    expect(watchSpy).toReturnTimes(0);
    expect(watchSpy).toBeCalledTimes(1);

    s.foo++;

    await resolveScheduler();
    await allowInternal(() => waitForSchedulersToFlush());

    // expect(schedulerSpy).toBeCalledTimes(1);

    expect(watchSpy).toHaveLastReturnedWith(3);
  });
});
