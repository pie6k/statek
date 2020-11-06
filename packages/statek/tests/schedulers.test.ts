import {
  createAsyncScheduler,
  store,
  watch,
  waitForSchedulersToFlush,
  manualWatch,
  allowInternal,
} from 'statek';
import { manualPromise, watchWarn } from './utils';

describe('async scheduler', () => {
  it('should restore scheduled call if reaction was cancelled before scheduler flushed', async () => {
    const [promise, resolve] = manualPromise();
    const scheduler = createAsyncScheduler(async task => {
      await promise;
      task();
    });

    const s = store({ foo: 1 });

    const watchSpy = jest.fn(() => {
      s.foo;
    });

    watch(watchSpy, { scheduler });

    expect(watchSpy).toBeCalledTimes(1);

    s.foo++;

    expect(watchSpy).toBeCalledTimes(1);

    s.foo++;

    expect(watchSpy).toBeCalledTimes(1);

    await resolve();
    await allowInternal(() => waitForSchedulersToFlush());

    expect(watchSpy).toBeCalledTimes(2);
    // manualPromise
  });
});
