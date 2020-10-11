import { observable, watch } from '@statek/core/lib';
import { ITERATION_KEY } from '../lib/operations';

describe('debugger', () => {
  it('should debug get operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = jest.fn();
    watch(() => (dummy = counter.num), {
      debug: debugSpy,
    });

    expect(dummy).toBe(0);
    expect(debugSpy).toBeCalledTimes(1);
    expect(debugSpy).toHaveBeenLastCalledWith({
      type: 'get',
      target: rawCounter,
      key: 'num',
    });
  });

  it('should debug has operations', () => {
    let dummy;
    const rawCounter = {};
    const counter = observable<any>(rawCounter);
    const debugSpy = jest.fn();
    watch(() => (dummy = 'num' in counter), {
      debug: debugSpy,
    });

    expect(dummy).toBe(false);
    expect(debugSpy).toBeCalledTimes(1);
    expect(debugSpy).toHaveBeenLastCalledWith({
      type: 'has',
      target: rawCounter,
      key: 'num',
    });
  });

  it('should debug iteration operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = jest.fn();
    watch(
      () => {
        for (const key in counter) {
          dummy = key;
        }
      },
      {
        debug: debugSpy,
      },
    );

    expect(dummy).toBe('num');
    expect(debugSpy).toBeCalledTimes(1);
    expect(debugSpy).toHaveBeenLastCalledWith({
      key: ITERATION_KEY,
      type: 'iterate',
      target: rawCounter,
    });
  });

  it('should debug add operations', () => {
    let dummy;
    const rawCounter = {};
    const counter = observable<any>(rawCounter);
    const debugSpy = jest.fn();
    watch(() => (dummy = counter.num), {
      debug: debugSpy,
    });

    expect(dummy).toBe(undefined);
    expect(debugSpy).toBeCalledTimes(1);
    counter.num = 12;
    expect(dummy).toBe(12);
    expect(debugSpy).toBeCalledTimes(3);

    expect(debugSpy).toHaveBeenNthCalledWith(2, {
      type: 'add',
      target: rawCounter,
      key: 'num',
      value: 12,
    });
  });

  it('should debug set operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = jest.fn();
    watch(() => (dummy = counter.num), {
      debug: debugSpy,
    });

    expect(dummy).toBe(0);
    expect(debugSpy).toBeCalledTimes(1);
    counter.num = 12;
    expect(dummy).toBe(12);
    expect(debugSpy).toBeCalledTimes(3);
    expect(debugSpy).toHaveBeenNthCalledWith(2, {
      type: 'set',
      target: rawCounter,
      key: 'num',
      value: 12,
    });
  });

  it('should debug delete operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = jest.fn();
    watch(() => (dummy = counter.num), {
      debug: debugSpy,
    });

    expect(dummy).toBe(0);
    expect(debugSpy).toBeCalledTimes(1);
    delete counter.num;
    expect(dummy).toBe(undefined);
    expect(debugSpy).toBeCalledTimes(3);
    expect(debugSpy).toHaveBeenNthCalledWith(2, {
      type: 'delete',
      target: rawCounter,
      key: 'num',
    });
  });

  it('should debug clear operations', () => {
    let dummy;
    const rawMap = new Map();
    rawMap.set('key', 'value');
    const map = observable<any>(rawMap);
    const debugSpy = jest.fn();
    watch(() => (dummy = map.get('key')), {
      debug: debugSpy,
    });

    expect(dummy).toBe('value');
    expect(debugSpy).toBeCalledTimes(1);
    const oldMap = new Map(rawMap);
    map.clear();
    expect(dummy).toBe(undefined);
    expect(debugSpy).toBeCalledTimes(3);
    expect(debugSpy).toHaveBeenNthCalledWith(2, {
      type: 'clear',
      target: rawMap,
    });
  });

  it('should not cause infinite loops', () => {
    const rawCounter = { num: 0 };
    const counter = observable(rawCounter);
    const debugSpy = jest.fn();
    watch(() => counter.num, {
      debug: debugSpy,
    });

    expect(debugSpy).toBeCalledTimes(1);
  });
});
