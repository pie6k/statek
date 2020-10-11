import {
  isObservable,
  observable,
  watch,
  getObservableRaw,
} from '@statek/core/lib';

describe('Map', () => {
  it('should be a proper JS Map', () => {
    const map = observable(new Map());
    expect(map).toBeInstanceOf(Map);
    expect(getObservableRaw(map)).toBeInstanceOf(Map);
  });

  it('should observe mutations', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => (dummy = map.get('key')));

    expect(dummy).toBe(undefined);
    map.set('key', 'value');
    expect(dummy).toBe('value');
    map.set('key', 'value2');
    expect(dummy).toBe('value2');
    map.delete('key');
    expect(dummy).toBe(undefined);
  });

  it('should observe size mutations', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => (dummy = map.size));

    expect(dummy).toBe(0);
    map.set('key1', 'value');
    map.set('key2', 'value2');
    expect(dummy).toBe(2);
    map.delete('key1');
    expect(dummy).toBe(1);
    map.clear();
    expect(dummy).toBe(0);
  });

  it('should observe for of iteration', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => {
      dummy = 0;
      // eslint-disable-next-line no-unused-vars
      for (let [key, num] of map) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    map.set('key0', 3);
    expect(dummy).toBe(3);
    map.set('key1', 2);
    expect(dummy).toBe(5);
    map.delete('key0');
    expect(dummy).toBe(2);
    map.clear();
    expect(dummy).toBe(0);
  });

  it('should observe forEach iteration', () => {
    let dummy: number | null = null;
    const map = observable(new Map());
    watch(() => {
      dummy = 0;
      map.forEach(num => (dummy += num));
    });

    expect(dummy).toBe(0);
    map.set('key0', 3);
    expect(dummy).toBe(3);
    map.set('key1', 2);
    expect(dummy).toBe(5);
    map.delete('key0');
    expect(dummy).toBe(2);
    map.clear();
    expect(dummy).toBe(0);
  });

  it('should observe keys iteration', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => {
      dummy = 0;
      for (let key of map.keys()) {
        dummy += key;
      }
    });

    expect(dummy).toBe(0);
    map.set(3, 3);
    expect(dummy).toBe(3);
    map.set(2, 2);
    expect(dummy).toBe(5);
    map.delete(3);
    expect(dummy).toBe(2);
    map.clear();
    expect(dummy).toBe(0);
  });

  it('should observe values iteration', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => {
      dummy = 0;
      for (let num of map.values()) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    map.set('key0', 3);
    expect(dummy).toBe(3);
    map.set('key1', 2);
    expect(dummy).toBe(5);
    map.delete('key0');
    expect(dummy).toBe(2);
    map.clear();
    expect(dummy).toBe(0);
  });

  it('should observe entries iteration', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => {
      dummy = 0;
      // eslint-disable-next-line no-unused-vars
      for (let [key, num] of map.entries()) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    map.set('key0', 3);
    expect(dummy).toBe(3);
    map.set('key1', 2);
    expect(dummy).toBe(5);
    map.delete('key0');
    expect(dummy).toBe(2);
    map.clear();
    expect(dummy).toBe(0);
  });

  it('should be triggered by clearing', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => (dummy = map.get('key')));

    expect(dummy).toBe(undefined);
    map.set('key', 3);
    expect(dummy).toBe(3);
    map.clear();
    expect(dummy).toBe(undefined);
  });

  it('should not observe custom property mutations', () => {
    let dummy;
    const map = observable<any>(new Map());
    watch(() => (dummy = map.customProp));

    expect(dummy).toBe(undefined);
    map.customProp = 'Hello World';
    expect(dummy).toBe(undefined);
  });

  it('should not observe non value changing mutations', () => {
    let dummy;
    const map = observable(new Map());
    const mapSpy = jest.fn(() => (dummy = map.get('key')));
    watch(mapSpy);

    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(1);
    map.set('key', 'value');
    expect(dummy).toBe('value');
    expect(mapSpy).toBeCalledTimes(2);
    map.set('key', 'value');
    expect(dummy).toBe('value');
    expect(mapSpy).toBeCalledTimes(2);
    map.delete('key');
    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(3);
    map.delete('key');
    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(3);
    map.clear();
    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(3);
  });

  it('should not observe raw data', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => (dummy = getObservableRaw(map).get('key')));

    expect(dummy).toBe(undefined);
    map.set('key', 'Hello');
    expect(dummy).toBe(undefined);
    map.delete('key');
    expect(dummy).toBe(undefined);
  });

  it('should not observe raw iterations', () => {
    let dummy = 0;
    const map = observable<any>(new Map());
    watch(() => {
      dummy = 0;
      // eslint-disable-next-line no-unused-vars
      for (let [key, num] of getObservableRaw(map).entries()) {
        dummy += num;
      }
      for (let key of getObservableRaw(map).keys()) {
        dummy += getObservableRaw(map).get(key);
      }
      for (let num of getObservableRaw(map).values()) {
        dummy += num;
      }
      getObservableRaw(map).forEach((num: any, key: any) => {
        dummy += num;
      });
      // eslint-disable-next-line no-unused-vars
      for (let [key, num] of getObservableRaw(map)) {
        dummy += num;
      }
    });

    expect(dummy).toBe(0);
    map.set('key1', 2);
    map.set('key2', 3);
    expect(dummy).toBe(0);
    map.delete('key1');
    expect(dummy).toBe(0);
  });

  it('should not be triggered by raw mutations', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => (dummy = map.get('key')));

    expect(dummy).toBe(undefined);
    getObservableRaw(map).set('key', 'Hello');
    expect(dummy).toBe(undefined);
    dummy = 'Thing';
    getObservableRaw(map).delete('key');
    expect(dummy).toBe('Thing');
    getObservableRaw(map).clear();
    expect(dummy).toBe('Thing');
  });

  it('should not observe raw size mutations', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => (dummy = getObservableRaw(map).size));

    expect(dummy).toBe(0);
    map.set('key', 'value');
    expect(dummy).toBe(0);
  });

  it('should not be triggered by raw size mutations', () => {
    let dummy;
    const map = observable(new Map());
    watch(() => (dummy = map.size));

    expect(dummy).toBe(0);
    getObservableRaw(map).set('key', 'value');
    expect(dummy).toBe(0);
  });

  it('should support objects as key', () => {
    let dummy;
    const key = {};
    const map = observable(new Map());
    const mapSpy = jest.fn(() => (dummy = map.get(key)));
    watch(mapSpy);

    expect(dummy).toBe(undefined);
    expect(mapSpy).toBeCalledTimes(1);

    map.set(key, 1);
    expect(dummy).toBe(1);
    expect(mapSpy).toBeCalledTimes(2);

    map.set({}, 2);
    expect(dummy).toBe(1);
    expect(mapSpy).toBeCalledTimes(2);
  });

  it('should wrap object values with observables when requested from a reaction', () => {
    const map = observable(new Map());
    map.set('key', {});
    map.set('key2', {});

    expect(isObservable(map.get('key'))).toBe(false);
    expect(isObservable(map.get('key2'))).toBe(false);
    watch(() => expect(isObservable(map.get('key'))).toBe(true));
    expect(isObservable(map.get('key'))).toBe(true);
    expect(isObservable(map.get('key2'))).toBe(false);
  });

  it('should wrap object values with observables when iterated from a reaction', () => {
    const map = observable(new Map());
    map.set('key', {});

    map.forEach(value => expect(isObservable(value)).toBe(false));
    for (let [key, value] of map) {
      expect(isObservable(value)).toBe(false);
    }
    for (let [key, value] of map.entries()) {
      expect(isObservable(value)).toBe(false);
    }
    for (let value of map.values()) {
      expect(isObservable(value)).toBe(false);
    }

    watch(() => {
      map.forEach(value => expect(isObservable(value)).toBe(true));
      for (let [key, value] of map) {
        expect(isObservable(value)).toBe(true);
      }
      for (let [key, value] of map.entries()) {
        expect(isObservable(value)).toBe(true);
      }
      for (let value of map.values()) {
        expect(isObservable(value)).toBe(true);
      }
    });

    map.forEach(value => expect(isObservable(value)).toBe(true));
    for (let [key, value] of map) {
      expect(isObservable(value)).toBe(true);
    }
    for (let [key, value] of map.entries()) {
      expect(isObservable(value)).toBe(true);
    }
    for (let value of map.values()) {
      expect(isObservable(value)).toBe(true);
    }
  });
});
