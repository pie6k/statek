import { store, sync, watch } from '@statek/core/lib';

describe('sync', () => {
  it('will skip scheduler if called in sync mode', () => {
    const obj = store({
      a: 1,
    });

    const spy = jest.fn(() => {
      obj.a;
    });
    const neverScheduler = jest.fn(() => {});

    watch(spy, { scheduler: neverScheduler });

    expect(spy).toBeCalledTimes(1);
    expect(neverScheduler).toBeCalledTimes(0);

    obj.a++;

    expect(spy).toBeCalledTimes(1);
    expect(neverScheduler).toBeCalledTimes(1);

    sync(() => {
      obj.a++;
    });

    expect(spy).toBeCalledTimes(2);
    expect(neverScheduler).toBeCalledTimes(1);
  });

  it('sync operations are batched', () => {
    const obj = store({
      a: 1,
      b: 2,
    });

    const spy = jest.fn(() => {
      obj.a;
      obj.b;
    });

    watch(spy);

    expect(spy).toBeCalledTimes(1);

    obj.a++;
    obj.b++;

    expect(spy).toBeCalledTimes(3);

    sync(() => {
      obj.a++;
      obj.b++;
    });

    expect(spy).toBeCalledTimes(4);
  });
});
