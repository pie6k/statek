import { isStore, store, watch, getStoreRaw } from '@statek/core/lib';
import { watchWarn } from './utils';

describe('store - creating', () => {
  it('should return a new store when no argument is provided', () => {
    const obs = store({});
    expect(isStore(obs)).toBe(true);
  });

  it('should throw when creating non-object store', () => {
    expect(() => {
      // @ts-expect-error
      store('foo');
    }).toThrow();
  });

  it('should resolve factory function', () => {
    const s = store(() => ({ foo: 1 }));

    expect(s.foo).toEqual(1);
  });

  it('should throw when using built in function as factory', () => {
    expect(() => {
      store(parseInt);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Observable cannot be created from Number. Reason - Non object value"`,
    );
  });

  it('should throw when factory resolves to incorrect result', () => {
    expect(() => {
      store(() => 'foo');
    }).toThrowErrorMatchingInlineSnapshot(
      `"Observable cannot be created from String. Reason - Non object value"`,
    );

    expect(() => {
      store(() => /a/);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Observable cannot be created from RegExp. Reason - Built in object or accessable in global / window"`,
    );
  });

  it('should allow creating store from class instance', () => {
    class Foo {
      bar = 1;
    }
    expect(() => {
      store(new Foo());
    }).not.toThrow();
  });

  it('should return an store wrapping of an object argument', () => {
    const obj = { prop: 'value' };
    const obs = store(obj);
    expect(obs).not.toBe(obj);
    expect(isStore(obs)).toBe(true);
  });

  it('should return the argument if it is already an store', () => {
    const obs1 = store({});
    const obs2 = store(obs1);
    expect(obs1).toBe(obs2);
  });

  it('should return the same store wrapper when called repeatedly with the same argument', () => {
    const obj = { prop: 'value' };
    const obs1 = store(obj);
    const obs2 = store(obj);
    expect(obs1).toBe(obs2);
  });

  it('should not throw on none writable nested objects, should simply not observe them instead', () => {
    let dummy;
    const obj: any = {};
    Object.defineProperty(obj, 'prop', {
      value: { num: 12 },
      writable: false,
      configurable: false,
    });
    const obs = store<any>(obj);
    expect(() => watch(() => (dummy = obs.prop.num))).not.toThrow();
    expect(dummy).toBe(12);
    obj.prop.num = 13;
    expect(dummy).toBe(12);
  });

  it('should wrap into observable even if not watched', () => {
    const obs = store({ foo: { bar: 2 } });

    expect(isStore(obs.foo)).toBe(true);
  });

  it('should not double wrap if setting existing store', () => {
    const obs = store({ foo: { bar: 2 } });

    const previousNested = obs.foo;

    obs.foo = store({ bar: 3 });

    expect(isStore(obs.foo)).toBe(true);
    expect(previousNested).not.toBe(obs.foo);

    expect(store(getStoreRaw(obs.foo))).toBe(obs.foo);
  });
});

describe('isStore', () => {
  it('should return true if an store is passed as argument', () => {
    const obs = store({});
    const isObs = isStore(obs);
    expect(isObs).toBe(true);
  });

  it('should return false if a non store is passed as argument', () => {
    const obj1 = { prop: 'value' };
    const obj2 = new Proxy({}, {});
    const isObs1 = isStore(obj1);
    const isObs2 = isStore(obj2);
    expect(isObs1).toBe(false);
    expect(isObs2).toBe(false);
  });

  it('should return false if a primitive is passed as argument', () => {
    expect(isStore(12)).toBe(false);
  });
});

describe('getStoreRaw', () => {
  it('should return the raw non-reactive object', () => {
    const obj: any = {};
    const obs = store(obj);
    expect(getStoreRaw(obs)).toBe(obj);
    expect(() => getStoreRaw(obj)).toThrow();
  });

  it('should work with plain primitives', () => {
    // @ts-expect-error
    expect(() => getStoreRaw(12)).toThrow();
  });

  it('should warn when JSON.stringify store', () => {
    const s = store({ foo: 2 });

    const warn = watchWarn();

    JSON.stringify(s);

    expect(warn.getLast()).toEqual([
      "You're calling JSON.stringify on the store. This will read every single, nested field of the store in reactive mode which can have performance impact. Consider calling `JSON.stringify(dontWatch(() => store))` instead.",
    ]);
  });
});
