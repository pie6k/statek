/**
 * @jest-environment jsdom
 */
import {
  store,
  getStoreRaw,
  manualWatch,
  watch,
  selector,
} from '@statek/core/lib';
import { awaitSuspended, manualPromise, waitNextTick } from './utils';

describe('manualWatch - async', () => {
  it('it should suspend and call change callback when function successfully returned', async () => {
    const [promise, resolve] = manualPromise();
    const asyncName = selector(() => promise);
    const spy = jest.fn();
    function greet(greeting: string = 'Hello') {
      spy();
      return `${greeting}, ${asyncName.value}`;
    }

    const needRefreshSpy = jest.fn(() => {});
    const call = manualWatch(greet);

    const resultPromise = awaitSuspended(() => call('Hello'));

    await resolve('Tom');

    const result = await resultPromise;

    expect(result).toBe('Hello, Tom');
    expect(spy).toBeCalledTimes(2);
  });

  it('should call manual callback after successful return', async () => {
    const lastNameStore = store({ last: 'Doe' });
    const [namePromise, resolve] = manualPromise();
    const asyncName = selector(async function (this: any) {
      const name = 'Tom';
      return `${name} ${lastNameStore.last}`;
    });
    const spy = jest.fn();
    function greet(greeting: string = 'Hello') {
      spy();
      return `${greeting}, ${asyncName.value}`;
    }

    const needRefreshSpy = jest.fn(() => {});
    const call = manualWatch(greet, needRefreshSpy);

    const resultPromise = awaitSuspended(() => call('Hello'));

    await resolve('Tom');

    const result = await resultPromise;

    expect(result).toBe('Hello, Tom Doe');
    expect(spy).toBeCalledTimes(2);

    expect(needRefreshSpy).toBeCalledTimes(0);

    lastNameStore.last = 'Boe';

    await waitNextTick();

    expect(needRefreshSpy).toBeCalledTimes(1);
    expect(spy).toBeCalledTimes(2);
  });
});
