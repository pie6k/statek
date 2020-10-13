import { dontWatch, store, sync, watch } from '@statek/core/lib';

describe('dontWatch', () => {
  it('will ignore read access inside dontWatch', () => {
    const obj = store({
      a: 1,
      b: 2,
      c: 3,
    });

    const spy = jest.fn(() => {
      obj.a;
      dontWatch(() => {
        obj.b;
      });
      obj.c;
    });

    watch(spy);

    expect(spy).toBeCalledTimes(1);

    obj.b++;

    expect(spy).toBeCalledTimes(1);

    obj.a++;

    expect(spy).toBeCalledTimes(2);

    obj.c++;

    expect(spy).toBeCalledTimes(3);
  });
});
