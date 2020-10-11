import {
  isObservable,
  observable,
  observe,
  getObservableRaw,
} from '../../src/observable';
/* eslint no-unused-expressions: 0, no-unused-vars: 0 */

import { spy } from '../utils';

describe('WeakMap', () => {
  it('should be a proper JS WeakMap', () => {
    const map = observable(new WeakMap());
    expect(map).toBeInstanceOf(WeakMap);
    expect(getObservableRaw(map)).toBeInstanceOf(WeakMap);
  });

  it('should observe mutations', () => {
    let dummy;
    const key = {};
    const map = observable(new WeakMap());
    observe(() => (dummy = map.get(key)));

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
    const map = observable(new WeakMap());
    // @ts-expect-error
    observe(() => (dummy = map.customProp));

    expect(dummy).toBe(undefined);
    // @ts-expect-error
    map.customProp = 'Hello World';
    expect(dummy).toBe(undefined);
  });

  it('should not observe non value changing mutations', () => {
    let dummy;
    const key = {};
    const map = observable(new WeakMap());
    const mapSpy = spy(() => (dummy = map.get(key)));
    observe(mapSpy);

    expect(dummy).toBe(undefined);
    expect(mapSpy.callCount).toBe(1);
    map.set(key, 'value');
    expect(dummy).toBe('value');
    expect(mapSpy.callCount).toBe(2);
    map.set(key, 'value');
    expect(dummy).toBe('value');
    expect(mapSpy.callCount).toBe(2);
    map.delete(key);
    expect(dummy).toBe(undefined);
    expect(mapSpy.callCount).toBe(3);
    map.delete(key);
    expect(dummy).toBe(undefined);
    expect(mapSpy.callCount).toBe(3);
  });

  it('should not observe raw data', () => {
    const key = {};
    let dummy;
    const map = observable(new WeakMap());
    observe(() => (dummy = getObservableRaw(map).get(key)));

    expect(dummy).toBe(undefined);
    map.set(key, 'Hello');
    expect(dummy).toBe(undefined);
    map.delete(key);
    expect(dummy).toBe(undefined);
  });

  it('should not be triggered by raw mutations', () => {
    const key = {};
    let dummy;
    const map = observable(new WeakMap());
    observe(() => (dummy = map.get(key)));

    expect(dummy).toBe(undefined);
    getObservableRaw(map).set(key, 'Hello');
    expect(dummy).toBe(undefined);
    getObservableRaw(map).delete(key);
    expect(dummy).toBe(undefined);
  });

  it('should wrap object values with observables when requested from a reaction', () => {
    const key = {};
    const key2 = {};
    const map = observable(new Map());
    map.set(key, {});
    map.set(key2, {});

    expect(isObservable(map.get(key))).toBe(false);
    expect(isObservable(map.get(key2))).toBe(false);
    observe(() => expect(isObservable(map.get(key))).toBe(true));
    expect(isObservable(map.get(key))).toBe(true);
    expect(isObservable(map.get(key2))).toBe(false);
  });
});
