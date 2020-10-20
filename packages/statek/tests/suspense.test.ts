import { isStore, manualWatch, selector, store, watch } from '../lib';
import { _countReadOperations } from '../lib/operations';
import { warmSelectors } from '../lib/selector';
import { manualPromise, waitNextTick, watchWarn } from './utils';

describe('suspense', () => {
  it('should re-run once if multiple promises suspended', async () => {
    const [p1, resolve1] = manualPromise();
    const [p2, resolve2] = manualPromise();

    const s1 = selector(() => p1);
    const s2 = selector(() => p2);

    const spy = jest.fn(() => {
      warmSelectors(s1, s2);

      return `${s1.value} + ${s2.value}`;
    });

    watch(spy, { name: 'suspWatch' });

    expect(spy).toBeCalledTimes(1);

    await resolve1('foo');

    // Not all promises resolved - it should still wait
    expect(spy).toBeCalledTimes(1);

    await resolve2('bar');

    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveLastReturnedWith('foo + bar');
  });

  it('should throw if not able to resolve suspended many times', async () => {
    const warn = watchWarn();
    watch(() => {
      throw Promise.resolve();
    });

    await waitNextTick();

    expect(warn.getLast()).toEqual([
      'The same reaction suspended 5 times in a row. Assuming error to avoid infinite loop. Some promise is that is suspending is probably re-created on each call',
    ]);
  });
});
