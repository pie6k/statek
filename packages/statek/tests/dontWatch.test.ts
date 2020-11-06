import { dontWatch, isStore, store, watch } from 'statek';
import { watchWarn } from './utils';

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

  it('will not trigger mutation operations called inside dontWatch', () => {
    const s = store({
      foo: 1,
    });

    const watchSpy = jest.fn(() => {
      s.foo;
    });

    watch(watchSpy);

    const warn = watchWarn();

    expect(watchSpy).toBeCalledTimes(1);
    dontWatch(() => {
      s.foo++;
    });
    expect(watchSpy).toBeCalledTimes(1);

    expect(warn.getLast()).toMatchInlineSnapshot(`
      Array [
        "You're mutating the store during dontWatch call and performed mutation would trigger at least 1 reaction normally, but they are ignored.",
      ]
    `);
  });

  it('will not warn if explicit said to ignore dontWatch mutations warning', () => {
    const s = store({
      foo: 1,
    });

    const watchSpy = jest.fn(() => {
      s.foo;
    });

    watch(watchSpy);

    const warn = watchWarn();

    expect(watchSpy).toBeCalledTimes(1);
    dontWatch(
      () => {
        s.foo++;
      },
      { ignoreMutationWarning: true },
    );
    expect(watchSpy).toBeCalledTimes(1);

    expect(warn.getLast()).toBe(null);
  });
});
