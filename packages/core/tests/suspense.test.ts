import { isStore, manualWatch, selector, store, watch } from '../lib';
import { _countReadOperations } from '../lib/operations';
import { warmSelectors } from '../lib/selector';
import { manualPromise } from './utils';

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

    resolve1('foo');

    await expect(p1).resolves.toBe('foo');

    // Not all promises resolved - it should still wait
    expect(spy).toBeCalledTimes(1);

    resolve2('bar');

    await expect(p2).resolves.toBe('bar');

    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveLastReturnedWith('foo + bar');
  });
});
