/**
 * @jest-environment jsdom
 */
import { selector, store, watch } from '@statek/core/lib';
import { isReaction } from '../lib/reaction';
import { getRunningReaction } from '../lib/reactionsStack';
import { manualPromise, waitNextTick } from './utils';

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

  it('should should keep the same reaction as runnign', async () => {
    const [promise1, resolve1] = manualPromise<string>();
    const [promise2, resolve2] = manualPromise<string>();
    const [promise3, resolve3] = manualPromise<string>();

    const registeredReactions: any[] = [];

    function registerReaction() {
      const reaction = getRunningReaction();
      registeredReactions.push(reaction);

      return reaction;
    }

    let initialReaction: any;

    const sel = selector(() => true);

    watch(async () => {
      initialReaction = registerReaction();

      await promise1;
      registerReaction();
      await promise2;
      sel.value;
      registerReaction();
      await promise3;
      registerReaction();
    });

    await Promise.all([resolve1(), resolve2(), resolve3()]);

    expect(registeredReactions).toHaveLength(4);
    expect(isReaction(initialReaction)).toBeTruthy();

    registeredReactions.forEach(reaction => {
      expect(reaction).toBe(initialReaction);
    });
  });

  it('should cancel watch on next step and start over if dependency change', async () => {
    const [promise1, resolve1] = manualPromise<string>();
    const [promise2, resolve2] = manualPromise<string>();

    const s = store({ foo: 'foo', bar: 'bar', baz: 'baz' });

    const spy = jest.fn((val: any) => {
      return val;
    });

    const endSpy = jest.fn();

    watch(async () => {
      const initialFoo = spy(s.foo);

      await promise1;

      spy(s.bar);
      await promise2;

      spy(s.baz);
      endSpy(`${initialFoo}`);
    });

    expect(spy).toBeCalledTimes(1);

    await resolve1();

    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('bar');

    s.foo = 'foo2';

    await resolve2();

    expect(spy).toBeCalledTimes(5);

    await waitNextTick();

    expect(endSpy).toBeCalledTimes(1);
    expect(endSpy).toHaveBeenLastCalledWith('foo2');
  });

  it('should cancel watch on next step and start over if dependency change having async selector', async () => {
    const [promise1, resolve1] = manualPromise<string>();
    const [promise2, resolve2] = manualPromise<string>();
    const [selPromise, resolveSel] = manualPromise<string>();

    const s = store({ foo: 'foo', bar: 'bar', baz: 'baz' });

    const spy = jest.fn((val: any) => {
      return val;
    });

    const sel = selector(async () => {
      const selValue = await selPromise;

      return `${s.foo}${selValue}`;
    });

    const endSpy = jest.fn();

    watch(async () => {
      await promise1;

      const initialFoo = s.foo;

      spy(initialFoo);

      await sel.promise;

      spy(s.bar);

      await promise2;

      spy(s.baz);
      endSpy(`${initialFoo}`);
    });

    expect(spy).toBeCalledTimes(0);

    await resolve1();

    expect(spy).toBeCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith('foo');

    await resolveSel('sel');
    await waitNextTick();
    await waitNextTick();

    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('bar');

    s.foo = 'foo2';

    await waitNextTick();
    expect(spy).toBeCalledTimes(4);

    await resolve2();

    expect(spy).toBeCalledTimes(5);

    await waitNextTick();

    expect(endSpy).toBeCalledTimes(1);
    expect(endSpy).toHaveBeenLastCalledWith('foo2');
  });
});
