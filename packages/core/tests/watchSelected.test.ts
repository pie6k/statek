/**
 * @jest-environment jsdom
 */
import { store, watch, watchAllChanges } from '@statek/core/lib';

describe('watchSingleObservable', () => {
  it('should run the passed function once (wrapped by a reaction)', () => {
    const spy = jest.fn(() => {});
    const obj = store({ foo: 1 });

    watchAllChanges(obj, spy);

    obj.foo++;

    expect(spy).toBeCalledTimes(1);

    obj.foo++;

    expect(spy).toBeCalledTimes(2);
  });

  it('should throw when watchSingleObservable non observable', () => {
    expect(() => {
      watchAllChanges({ foo: 1 }, () => {});
    }).toThrow();
  });

  it('should stop calling callback when stopped watching', () => {
    const spy = jest.fn(() => {});
    const obj = store({ foo: 1 });

    const stop = watchAllChanges(obj, spy);

    obj.foo++;

    expect(spy).toBeCalledTimes(1);
    stop();

    obj.foo++;

    expect(spy).toBeCalledTimes(1);
  });

  it('should not allow watching selected twice with the same callback', () => {
    const obj = store({ foo: 1 });
    const spy = jest.fn(() => obj.foo);

    expect(() => {
      watchAllChanges(obj, spy);
      watchAllChanges(obj, spy);
    }).toThrow();
  });

  it('should watch selected even if its watched by other reaction', () => {
    const obj = store({ foo: 1 });

    const selectedChangeCallback = jest.fn(() => {});
    const watchSpy = jest.fn(() => obj.foo);

    watchAllChanges(obj, selectedChangeCallback);
    watch(watchSpy);

    expect(watchSpy).toBeCalledTimes(1);
    expect(selectedChangeCallback).toBeCalledTimes(0);

    obj.foo++;

    expect(watchSpy).toBeCalledTimes(2);
    expect(selectedChangeCallback).toBeCalledTimes(1);
  });

  it('should allow multiple watchers to work independently', () => {
    const spy = jest.fn(() => {});
    const nestedSpy = jest.fn(() => {});
    const obj = store({ foo: 1, bar: { baz: 2 } });

    const stop = watchAllChanges(obj, spy);
    const stopNested = watchAllChanges(obj.bar, nestedSpy);

    obj.foo++;

    expect(spy).toBeCalledTimes(1);
    expect(nestedSpy).toBeCalledTimes(0);

    obj.bar.baz++;

    expect(spy).toBeCalledTimes(2);
    expect(nestedSpy).toBeCalledTimes(1);

    stop();

    obj.bar.baz++;

    expect(spy).toBeCalledTimes(2);
    expect(nestedSpy).toBeCalledTimes(2);

    stopNested();

    obj.bar.baz++;

    expect(spy).toBeCalledTimes(2);
    expect(nestedSpy).toBeCalledTimes(2);
  });

  it('will watch various unobserved props', () => {
    const obj = store({
      a: 1,
      b: {
        c: 2,
      },
      d: [1],
      e: {
        f: [1],
      },
      g: {
        h: new Set<number>(),
        i: new Map<any, any>(),
        k: new Map<any, any>([[1, { foo: 2 }]]),
      },
      h: null,
      i: NaN,
      k: () => {},
      l: new Uint32Array(2),
    });

    const spy = jest.fn(() => {});

    const stop = watchAllChanges(() => obj, spy);

    obj.a++;
    expect(spy).toBeCalledTimes(1);
    obj.b.c++;
    expect(spy).toBeCalledTimes(2);
    obj.d.push(2);
    expect(spy).toBeCalledTimes(3);
    obj.e.f.push(2);
    expect(spy).toBeCalledTimes(4);
    obj.g.h.add(1);
    expect(spy).toBeCalledTimes(5);
    obj.g.i.set(1, 2);
    expect(spy).toBeCalledTimes(6);
    obj.g.k.get(1).foo = 3;
    expect(spy).toBeCalledTimes(7);
    obj.l[2] = 30;
    expect(spy).toBeCalledTimes(8);

    stop();

    obj.a++;

    expect(spy).toBeCalledTimes(8);
  });
});
