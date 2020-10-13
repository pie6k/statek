import { isStore, store, watch, getStoreRaw } from '@statek/core/lib';

describe('observable', () => {
  it('should return a new observable when no argument is provided', () => {
    const obs = store({});
    expect(isStore(obs)).toBe(true);
  });

  it('should throw when creating non-object observable', () => {
    expect(() => {
      // @ts-expect-error
      store('foo');
    }).toThrow();
  });

  it('should throw when creating observable from function', () => {
    expect(() => {
      store(() => {});
    }).toThrow();
  });

  it('should allow creating observable from class instance', () => {
    class Foo {
      bar = 1;
    }
    expect(() => {
      store(new Foo());
    }).not.toThrow();
  });

  it('should return an observable wrapping of an object argument', () => {
    const obj = { prop: 'value' };
    const obs = store(obj);
    expect(obs).not.toBe(obj);
    expect(isStore(obs)).toBe(true);
  });

  it('should return the argument if it is already an observable', () => {
    const obs1 = store({});
    const obs2 = store(obs1);
    expect(obs1).toBe(obs2);
  });

  it('should return the same observable wrapper when called repeatedly with the same argument', () => {
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

  it('should never let observables leak into the underlying raw object', () => {
    const obj: any = {};
    const obs = store(obj);
    obs.nested1 = {};

    obs.nested2 = store({});
    expect(isStore(obj.nested1)).toBe(false);
    expect(isStore(obj.nested2)).toBe(false);
    expect(isStore(obs.nested1)).toBe(false);
    expect(isStore(obs.nested2)).toBe(true);
  });
});

describe('isObservable', () => {
  it('should return true if an observable is passed as argument', () => {
    const obs = store({});
    const isObs = isStore(obs);
    expect(isObs).toBe(true);
  });

  it('should return false if a non observable is passed as argument', () => {
    const obj1 = { prop: 'value' };
    const obj2 = new Proxy({}, {});
    const isObs1 = isStore(obj1);
    const isObs2 = isStore(obj2);
    expect(isObs1).toBe(false);
    expect(isObs2).toBe(false);
  });

  it('should return false if a primitive is passed as argument', () => {
    // @ts-expect-error
    expect(isStore(12)).toBe(false);
  });
});

describe('raw', () => {
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
});
