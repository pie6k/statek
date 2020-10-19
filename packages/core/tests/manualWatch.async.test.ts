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
import { warmSelectors } from '../lib/selector';
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

    const call = manualWatch(greet);

    const resultPromise = awaitSuspended(() => call('Hello'));

    await resolve('Tom');

    const result = await resultPromise;

    expect(result).toBe('Hello, Tom');
    expect(spy).toBeCalledTimes(2);
  });

  it('should call manual callback after successful return', async () => {
    const lastNameStore = store({ last: 'Doe' });

    const asyncName = selector(async () => {
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

    const result = await resultPromise;

    expect(result).toBe('Hello, Tom Doe');
    expect(spy).toBeCalledTimes(2);

    expect(needRefreshSpy).toBeCalledTimes(0);

    lastNameStore.last = 'Boe';

    await waitNextTick();

    expect(needRefreshSpy).toBeCalledTimes(1);
    expect(spy).toBeCalledTimes(2);
  });

  it('it should suspend with single promise if multiple selectors are warmed', async () => {
    const [promise, resolve] = manualPromise();
    const [promise2, resolve2] = manualPromise();
    const asyncName = selector(() => promise);
    const asyncName2 = selector(() => promise2);
    const spy = jest.fn();
    function greet(greeting: string = 'Hello') {
      warmSelectors(asyncName, asyncName2);
      spy();
      return `${greeting}, ${asyncName.value} and ${asyncName2.value}`;
    }

    const call = manualWatch(greet);

    const resultPromise = awaitSuspended(() => call('Hello'));

    await resolve('Tom');
    await resolve2('Bob');

    const result = await resultPromise;

    expect(result).toBe('Hello, Tom and Bob');
    expect(spy).toBeCalledTimes(2);
  });
});
