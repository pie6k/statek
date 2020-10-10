import { observable, observe } from '../src/observable';
import { spy } from './utils';

describe('debugger', () => {
  it('should debug get operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = spy(() => {});
    observe(() => (dummy = counter.num), {
      debugger: debugSpy,
    });

    expect(dummy).toBe(0);
    expect(debugSpy.callCount).toBe(1);
    expect(debugSpy.lastArgs).toEqual([
      {
        type: 'get',
        target: rawCounter,
        key: 'num',
        receiver: counter,
      },
    ]);
  });

  it('should debug has operations', () => {
    let dummy;
    const rawCounter = {};
    const counter = observable<any>(rawCounter);
    const debugSpy = spy(() => {});
    observe(() => (dummy = 'num' in counter), {
      debugger: debugSpy,
    });

    expect(dummy).toBe(false);
    expect(debugSpy.callCount).toBe(1);
    expect(debugSpy.lastArgs).toEqual([
      {
        type: 'has',
        target: rawCounter,
        key: 'num',
      },
    ]);
  });

  it('should debug iteration operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = spy(() => {});
    observe(
      () => {
        for (const key in counter) {
          dummy = key;
        }
      },
      {
        debugger: debugSpy,
      },
    );

    expect(dummy).toBe('num');
    expect(debugSpy.callCount).toBe(1);
    expect(debugSpy.lastArgs).toEqual([
      {
        type: 'iterate',
        target: rawCounter,
      },
    ]);
  });

  it('should debug add operations', () => {
    let dummy;
    const rawCounter = {};
    const counter = observable<any>(rawCounter);
    const debugSpy = spy(() => {});
    observe(() => (dummy = counter.num), {
      debugger: debugSpy,
    });

    expect(dummy).toBe(undefined);
    expect(debugSpy.callCount).toBe(1);
    counter.num = 12;
    expect(dummy).toBe(12);
    expect(debugSpy.callCount).toBe(3);
    expect(debugSpy.args[1]).toEqual([
      {
        type: 'add',
        target: rawCounter,
        key: 'num',
        value: 12,
        receiver: counter,
      },
    ]);
  });

  it('should debug set operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = spy(() => {});
    observe(() => (dummy = counter.num), {
      debugger: debugSpy,
    });

    expect(dummy).toBe(0);
    expect(debugSpy.callCount).toBe(1);
    counter.num = 12;
    expect(dummy).toBe(12);
    expect(debugSpy.callCount).toBe(3);
    expect(debugSpy.args[1]).toEqual([
      {
        type: 'set',
        target: rawCounter,
        key: 'num',
        value: 12,
        oldValue: 0,
        receiver: counter,
      },
    ]);
  });

  it('should debug delete operations', () => {
    let dummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = spy(() => {});
    observe(() => (dummy = counter.num), {
      debugger: debugSpy,
    });

    expect(dummy).toBe(0);
    expect(debugSpy.callCount).toBe(1);
    delete counter.num;
    expect(dummy).toBe(undefined);
    expect(debugSpy.callCount).toBe(3);
    expect(debugSpy.args[1]).toEqual([
      {
        type: 'delete',
        target: rawCounter,
        key: 'num',
        oldValue: 0,
      },
    ]);
  });

  it('should debug clear operations', () => {
    let dummy;
    const rawMap = new Map();
    rawMap.set('key', 'value');
    const map = observable<any>(rawMap);
    const debugSpy = spy(() => {});
    observe(() => (dummy = map.get('key')), {
      debugger: debugSpy,
    });

    expect(dummy).toBe('value');
    expect(debugSpy.callCount).toBe(1);
    const oldMap = new Map(rawMap);
    map.clear();
    expect(dummy).toBe(undefined);
    expect(debugSpy.callCount).toBe(3);
    expect(debugSpy.args[1]).toEqual([
      {
        type: 'clear',
        target: rawMap,
        oldTarget: oldMap,
      },
    ]);
  });

  it('should not cause infinite loops', () => {
    let receiverDummy;
    const rawCounter = { num: 0 };
    const counter = observable<any>(rawCounter);
    const debugSpy = spy(({ receiver }: any) => (receiverDummy = receiver.num));
    observe(() => counter.num, {
      debugger: debugSpy,
    });

    expect(receiverDummy).toBe(0);
    expect(debugSpy.callCount).toBe(1);
  });
});
