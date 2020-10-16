import { dontWatch, isStore, store, watch } from '@statek/core/lib';

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

  it('will return raw values on read', () => {
    const obj = store({
      a: 1,
      b: {
        c: 2,
      },
    });

    const obsraw = obj.b;
    const raw = dontWatch(() => obj.b);

    expect(isStore(raw)).toBe(false);
    expect(isStore(obsraw)).toBe(true);
  });

  it('will return raw observable itself', () => {
    const obj = store({
      a: 1,
    });

    const raw = dontWatch(() => obj);

    expect(isStore(raw)).toBe(false);
  });
});
