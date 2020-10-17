/**
 * @jest-environment jsdom
 */
import {
  store,
  watch,
  getStoreRaw,
  manualWatch,
  waitForSchedulersToFlush,
  allowInternal,
} from '@statek/core/lib';
import { allowNestedWatch } from '../lib/batch';
import {
  manualPromise,
  manualPromiseFactory,
  waitNextTick,
  watchWarn,
} from './utils';

describe('watch - async ', () => {
  it('should observe in one step async function', async () => {
    const counter = store({ num: 1 });
    const spy = jest.fn();

    watch(async () => {
      const result = counter.num;
      spy(result);
    });

    // await allowInternal(() => waitForSchedulersToFlush());

    expect(spy).toBeCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(1);

    counter.num++;

    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it('should observe next steps promises', async () => {
    const counter = store({ num: 1 });
    const startSpy = jest.fn();
    const spy = jest.fn();

    const [promise, resolve] = manualPromise<string>();

    watch(async () => {
      startSpy();
      const promiseResult = await promise;
      const result = counter.num + promiseResult;
      spy(result);
    });

    // await allowInternal(() => waitForSchedulersToFlush());
    expect(startSpy).toBeCalledTimes(1);
    expect(spy).toBeCalledTimes(0);

    counter.num++;

    expect(startSpy).toBeCalledTimes(1);
    expect(spy).toBeCalledTimes(0);

    await resolve('foo');

    expect(spy).toBeCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith('2foo');

    counter.num++;

    expect(startSpy).toBeCalledTimes(2);
  });
});
