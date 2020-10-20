import { batch, store, sync, syncEvery, watch } from 'statek';

describe('syncEvery', () => {
  it('sync every should call reactions on each update even if inside batch', () => {
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

    batch(() => {
      syncEvery(() => {
        obj.a++;
        obj.b++;
      });
    });

    expect(spy).toBeCalledTimes(3);
  });

  it('sync every should ignore nested batch', () => {
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

    syncEvery(() => {
      batch(() => {
        obj.a++;
        obj.b++;
      });
    });

    expect(spy).toBeCalledTimes(3);
  });

  it('sync every should skip scheduler', () => {
    const obj = store({
      a: 1,
    });

    const spy = jest.fn(() => {
      obj.a;
    });

    const neverScheduler = jest.fn();

    watch(spy, { scheduler: neverScheduler });

    expect(spy).toBeCalledTimes(1);

    syncEvery(() => {
      obj.a++;
    });

    expect(spy).toBeCalledTimes(2);
    expect(neverScheduler).toBeCalledTimes(0);
  });
});
