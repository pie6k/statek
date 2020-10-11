import {
  observable,
  observe,
  getObservableRaw,
} from '@statek/core/lib/observable';
import { spy } from '../utils';

describe('WeakSet', () => {
  it('should be a proper JS WeakSet', () => {
    const set = observable(new WeakSet());
    expect(set).toBeInstanceOf(WeakSet);
    expect(getObservableRaw(set)).toBeInstanceOf(WeakSet);
  });

  it('should observe mutations', () => {
    let dummy;
    const value = {};
    const set = observable(new WeakSet());
    observe(() => (dummy = set.has(value)));

    expect(dummy).toBe(false);
    set.add(value);
    expect(dummy).toBe(true);
    set.delete(value);
    expect(dummy).toBe(false);
  });

  it('should not observe custom property mutations', () => {
    let dummy;
    const set = observable<any>(new WeakSet());
    observe(() => (dummy = set.customProp));

    expect(dummy).toBe(undefined);
    set.customProp = 'Hello World';
    expect(dummy).toBe(undefined);
  });

  it('should not observe non value changing mutations', () => {
    let dummy;
    const value = {};
    const set = observable(new WeakSet());
    const setSpy = spy(() => (dummy = set.has(value)));
    observe(setSpy);

    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(1);
    set.add(value);
    expect(dummy).toBe(true);
    expect(setSpy.callCount).toBe(2);
    set.add(value);
    expect(dummy).toBe(true);
    expect(setSpy.callCount).toBe(2);
    set.delete(value);
    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(3);
    set.delete(value);
    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(3);
  });

  it('should not observe raw data', () => {
    const value = {};
    let dummy;
    const set = observable(new WeakSet());
    observe(() => (dummy = getObservableRaw(set).has(value)));

    expect(dummy).toBe(false);
    set.add(value);
    expect(dummy).toBe(false);
  });

  it('should not be triggered by raw mutations', () => {
    const value = {};
    let dummy;
    const set = observable(new WeakSet());
    observe(() => (dummy = set.has(value)));

    expect(dummy).toBe(false);
    getObservableRaw(set).add(value);
    expect(dummy).toBe(false);
  });
});
