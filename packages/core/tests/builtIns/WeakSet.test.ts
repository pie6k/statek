import { store, watch, getStoreRaw } from '@statek/core/lib';

describe('WeakSet', () => {
  it('should be a proper JS WeakSet', () => {
    const set = store(new WeakSet());
    expect(set).toBeInstanceOf(WeakSet);
    expect(getStoreRaw(set)).toBeInstanceOf(WeakSet);
  });

  it('should observe mutations', () => {
    let dummy;
    const value = {};
    const set = store(new WeakSet());
    watch(() => (dummy = set.has(value)));

    expect(dummy).toBe(false);
    set.add(value);
    expect(dummy).toBe(true);
    set.delete(value);
    expect(dummy).toBe(false);
  });

  it('should not observe custom property mutations', () => {
    let dummy;
    const set = store<any>(new WeakSet());
    watch(() => (dummy = set.customProp));

    expect(dummy).toBe(undefined);
    set.customProp = 'Hello World';
    expect(dummy).toBe(undefined);
  });

  it('should not observe non value changing mutations', () => {
    let dummy;
    const value = {};
    const set = store(new WeakSet());
    const setSpy = jest.fn(() => (dummy = set.has(value)));
    watch(setSpy);

    expect(dummy).toBe(false);
    expect(setSpy).toBeCalledTimes(1);
    set.add(value);
    expect(dummy).toBe(true);
    expect(setSpy).toBeCalledTimes(2);
    set.add(value);
    expect(dummy).toBe(true);
    expect(setSpy).toBeCalledTimes(2);
    set.delete(value);
    expect(dummy).toBe(false);
    expect(setSpy).toBeCalledTimes(3);
    set.delete(value);
    expect(dummy).toBe(false);
    expect(setSpy).toBeCalledTimes(3);
  });

  it('should not observe raw data', () => {
    const value = {};
    let dummy;
    const set = store(new WeakSet());
    watch(() => (dummy = getStoreRaw(set).has(value)));

    expect(dummy).toBe(false);
    set.add(value);
    expect(dummy).toBe(false);
  });

  it('should not be triggered by raw mutations', () => {
    const value = {};
    let dummy;
    const set = store(new WeakSet());
    watch(() => (dummy = set.has(value)));

    expect(dummy).toBe(false);
    getStoreRaw(set).add(value);
    expect(dummy).toBe(false);
  });
});
