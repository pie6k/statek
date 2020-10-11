import {
  isObservable,
  observable,
  observe,
  getObservableRaw,
} from '../../src/observable';
/* eslint no-unused-expressions: 0, no-unused-vars: 0 */

import { spy } from '../utils';

describe('Set', () => {
  it('should be a proper JS Set', () => {
    const set = observable<any>(new Set());
    expect(set).toBeInstanceOf(Set);
    expect(getObservableRaw(set)).toBeInstanceOf(Set);
  });

  it('should observe mutations', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = set.has('value')));

    expect(dummy).toBe(false);
    set.add('value');
    expect(dummy).toBe(true);
    set.delete('value');
    expect(dummy).toBe(false);
  });

  it('should observe for of iteration', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => {
      dummy = 0;
      for (let num of set) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    set.add(2);
    set.add(1);
    expect(dummy).toBe(3);
    set.delete(2);
    expect(dummy).toBe(1);
    set.clear();
    expect(dummy).toBe(0);
  });

  it('should observe forEach iteration', () => {
    let dummy: any;
    const set = observable<any>(new Set());
    observe(() => {
      dummy = 0;
      set.forEach((num: any) => (dummy += num));
    });

    expect(dummy).toBe(0);
    set.add(2);
    set.add(1);
    expect(dummy).toBe(3);
    set.delete(2);
    expect(dummy).toBe(1);
    set.clear();
    expect(dummy).toBe(0);
  });

  it('should observe values iteration', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => {
      dummy = 0;
      for (let num of set.values()) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    set.add(2);
    set.add(1);
    expect(dummy).toBe(3);
    set.delete(2);
    expect(dummy).toBe(1);
    set.clear();
    expect(dummy).toBe(0);
  });

  it('should observe keys iteration', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => {
      dummy = 0;
      for (let num of set.keys()) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    set.add(2);
    set.add(1);
    expect(dummy).toBe(3);
    set.delete(2);
    expect(dummy).toBe(1);
    set.clear();
    expect(dummy).toBe(0);
  });

  it('should observe entries iteration', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => {
      dummy = 0;
      // eslint-disable-next-line no-unused-vars
      for (let [key, num] of set.entries()) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    set.add(2);
    set.add(1);
    expect(dummy).toBe(3);
    set.delete(2);
    expect(dummy).toBe(1);
    set.clear();
    expect(dummy).toBe(0);
  });

  it('should be triggered by clearing', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = set.has('key')));

    expect(dummy).toBe(false);
    set.add('key');
    expect(dummy).toBe(true);
    set.clear();
    expect(dummy).toBe(false);
  });

  it('should not observe custom property mutations', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = set.customProp));

    expect(dummy).toBe(undefined);
    set.customProp = 'Hello World';
    expect(dummy).toBe(undefined);
  });

  it('should observe size mutations', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = set.size));

    expect(dummy).toBe(0);
    set.add('value');
    set.add('value2');
    expect(dummy).toBe(2);
    set.delete('value');
    expect(dummy).toBe(1);
    set.clear();
    expect(dummy).toBe(0);
  });

  it('should not observe non value changing mutations', () => {
    let dummy;
    const set = observable<any>(new Set());
    const setSpy = spy(() => (dummy = set.has('value')));
    observe(setSpy);

    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(1);
    set.add('value');
    expect(dummy).toBe(true);
    expect(setSpy.callCount).toBe(2);
    set.add('value');
    expect(dummy).toBe(true);
    expect(setSpy.callCount).toBe(2);
    set.delete('value');
    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(3);
    set.delete('value');
    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(3);
    set.clear();
    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(3);
  });

  it('should not observe raw data', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = getObservableRaw(set).has('value')));

    expect(dummy).toBe(false);
    set.add('value');
    expect(dummy).toBe(false);
  });

  it('should not observe raw iterations', () => {
    let dummy = 0;
    const set = observable<any>(new Set());
    observe(() => {
      dummy = 0;
      for (let [num] of getObservableRaw(set).entries()) {
        dummy += num;
      }
      for (let num of getObservableRaw(set).keys()) {
        dummy += num;
      }
      for (let num of getObservableRaw(set).values()) {
        dummy += num;
      }
      getObservableRaw(set).forEach((num: any) => {
        dummy += num;
      });
      for (let num of getObservableRaw(set)) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    set.add(2);
    set.add(3);
    expect(dummy).toBe(0);
    set.delete(2);
    expect(dummy).toBe(0);
  });

  it('should not be triggered by raw mutations', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = set.has('value')));

    expect(dummy).toBe(false);
    getObservableRaw(set).add('value');
    expect(dummy).toBe(false);
    dummy = true;
    getObservableRaw(set).delete('value');
    expect(dummy).toBe(true);
    getObservableRaw(set).clear();
    expect(dummy).toBe(true);
  });

  it('should not observe raw size mutations', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = getObservableRaw(set).size));

    expect(dummy).toBe(0);
    set.add('value');
    expect(dummy).toBe(0);
  });

  it('should not be triggered by raw size mutations', () => {
    let dummy;
    const set = observable<any>(new Set());
    observe(() => (dummy = set.size));

    expect(dummy).toBe(0);
    getObservableRaw(set).add('value');
    expect(dummy).toBe(0);
  });

  it('should support objects as key', () => {
    let dummy;
    const key = {};
    const set = observable<any>(new Set());
    const setSpy = spy(() => (dummy = set.has(key)));
    observe(setSpy);

    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(1);

    set.add({});
    expect(dummy).toBe(false);
    expect(setSpy.callCount).toBe(1);

    set.add(key);
    expect(dummy).toBe(true);
    expect(setSpy.callCount).toBe(2);
  });

  it('should wrap object values with observables when iterated from a reaction', () => {
    const set = observable<any>(new Set());
    set.add({});

    set.forEach((value: any) => expect(isObservable(value)).toBe(false));
    for (let value of set) {
      expect(isObservable(value)).toBe(false);
    }
    for (let [_, value] of set.entries()) {
      expect(isObservable(value)).toBe(false);
    }
    for (let value of set.values()) {
      expect(isObservable(value)).toBe(false);
    }

    observe(() => {
      set.forEach((value: any) => expect(isObservable(value)).toBe(true));
      for (let value of set) {
        expect(isObservable(value)).toBe(true);
      }
      for (let [_, value] of set.entries()) {
        expect(isObservable(value)).toBe(true);
      }
      for (let value of set.values()) {
        expect(isObservable(value)).toBe(true);
      }
    });

    set.forEach((value: any) => expect(isObservable(value)).toBe(true));
    for (let value of set) {
      expect(isObservable(value)).toBe(true);
    }
    for (let [_, value] of set.entries()) {
      expect(isObservable(value)).toBe(true);
    }
    for (let value of set.values()) {
      expect(isObservable(value)).toBe(true);
    }
  });
});
