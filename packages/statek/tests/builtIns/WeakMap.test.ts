import { isStore, store, watch, getStoreRaw } from 'statek';

describe('WeakMap', () => {
  it('should be a proper JS WeakMap', () => {
    const map = store(new WeakMap());
    expect(map).toBeInstanceOf(WeakMap);
    expect(getStoreRaw(map)).toBeInstanceOf(WeakMap);
  });

  it('should observe mutations', () => {
    let dummy;
    const key = {};
    const map = store(new WeakMap());
    watch(() => (dummy = map.get(key)));

    expect(dummy).toBe(undefined);
    map.set(key, 'value');
    expect(dummy).toBe('value');
    map.set(key, 'value2');
    expect(dummy).toBe('value2');
    map.delete(key);
    expect(dummy).toBe(undefined);
  });

  it('should not observe custom property mutations', () => {
    let dummy;
    const map = store(new WeakMap());
    // @ts-expect-error
    watch(() => (dummy = map.customProp));

    expect(dummy).toBe(undefined);
    // @ts-expect-error
    map.customProp = 'Hello World';
    expect(dummy).toBe(undefined);
  });

  it('should not observe non value changing mutations', () => {
    let dummy;
    const key = {};
    const map = store(new WeakMap());
    const mapSpy = jest.fn(() => (dummy = map.get(key)));
    watch(mapSpy);

    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(1);
    map.set(key, 'value');
    expect(dummy).toBe('value');
    expect(mapSpy).toBeCalledTimes(2);
    map.set(key, 'value');
    expect(dummy).toBe('value');
    expect(mapSpy).toBeCalledTimes(2);
    map.delete(key);
    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(3);
    map.delete(key);
    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(3);
  });

  it('should not observe raw data', () => {
    const key = {};
    let dummy;
    const map = store(new WeakMap());
    watch(() => (dummy = getStoreRaw(map).get(key)));

    expect(dummy).toBe(undefined);
    map.set(key, 'Hello');
    expect(dummy).toBe(undefined);
    map.delete(key);
    expect(dummy).toBe(undefined);
  });

  it('should not be triggered by raw mutations', () => {
    const key = {};
    let dummy;
    const map = store(new WeakMap());
    watch(() => (dummy = map.get(key)));

    expect(dummy).toBe(undefined);
    getStoreRaw(map).set(key, 'Hello');
    expect(dummy).toBe(undefined);
    getStoreRaw(map).delete(key);
    expect(dummy).toBe(undefined);
  });

  it('should wrap object values with observables', () => {
    const key = {};
    const key2 = {};
    const map = store(new Map());
    map.set(key, {});
    map.set(key2, {});

    expect(isStore(map.get(key))).toBe(true);
    expect(isStore(map.get(key2))).toBe(true);
  });
});
