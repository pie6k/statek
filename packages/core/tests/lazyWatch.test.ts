/**
 * @jest-environment jsdom
 */
import { store, getStoreRaw, lazyWatch } from '@statek/core/lib';

describe('observe', () => {
  it('should wrap the passed function seamlessly', () => {
    function greet() {
      return `Hello`;
    }
    const reaction = lazyWatch(greet);

    expect(reaction()).toBe('Hello');
  });

  it('should pass args passed to lazy watch', () => {
    function greet(name: string) {
      return `Hello, ${name}`;
    }
    const reaction = lazyWatch(greet);

    expect(reaction('World')).toBe('Hello, World');
  });

  it('should inform lazy watch about deps change, but not run it again', () => {
    let dummy: string = '';
    const obj = store({ prop: 'foo' });

    const reaction = jest.fn(() => obj.prop);
    const depsChangeCallback = jest.fn(() => {});
    const call = lazyWatch(reaction, depsChangeCallback);

    expect(reaction).toBeCalledTimes(0);
    expect(depsChangeCallback).toBeCalledTimes(0);

    call();

    expect(reaction).toBeCalledTimes(1);
    expect(depsChangeCallback).toBeCalledTimes(0);

    obj.prop = 'bar';

    expect(reaction).toBeCalledTimes(1);
    expect(depsChangeCallback).toBeCalledTimes(1);

    call();

    expect(reaction).toBeCalledTimes(2);
    expect(depsChangeCallback).toBeCalledTimes(1);

    obj.prop = 'baz';

    expect(reaction).toBeCalledTimes(2);
    expect(depsChangeCallback).toBeCalledTimes(2);
  });

  it('should properly pass context to lazyWatch', () => {
    let dummy: any;
    function greet(this: any) {
      dummy = this;
      return `Hello`;
    }
    const call = lazyWatch(greet, () => {}, { context: 'foo' });

    call();

    expect(dummy).toBe('foo');
  });

  it('should not allow lazywatch to be called when unsubscribed', () => {
    const obj = store({ prop: 'foo' });
    const spy = jest.fn(() => obj.prop);

    const call = lazyWatch(spy, spy);

    expect(() => {
      call();
    }).not.toThrow();

    call.unsubscribe();

    expect(() => {
      call();
    }).toThrow();
  });

  it('should not call lazyWatch callback before initial call', () => {
    const obj = store({ prop: 'foo' });
    const reaction = jest.fn(() => obj.prop);
    const changeCallback = jest.fn(() => {});

    lazyWatch(reaction, changeCallback);

    expect(reaction).toBeCalledTimes(0);
    expect(changeCallback).toBeCalledTimes(0);

    obj.prop = 'bar';

    expect(reaction).toBeCalledTimes(0);
    expect(changeCallback).toBeCalledTimes(0);
  });

  it('lazy reaction callback should not be called after unsubscribing', () => {
    const obj = store({ prop: 'foo' });
    const reaction = jest.fn(() => obj.prop);
    const changeCallback = jest.fn(() => {});

    const call = lazyWatch(reaction, changeCallback);

    call();

    expect(changeCallback).toBeCalledTimes(0);

    obj.prop = 'bar';

    expect(changeCallback).toBeCalledTimes(1);

    call.unsubscribe();

    obj.prop = 'baz';

    expect(changeCallback).toBeCalledTimes(1);
  });

  it('lazy callback could be subscribed again after unsubscribing', () => {
    const obj = store({ num: 0 });
    const reaction = jest.fn(() => obj.num);
    const callback = jest.fn();
    const call = lazyWatch(reaction, callback);

    call();

    expect(reaction).toBeCalledTimes(1);

    obj.num++;

    expect(callback).toBeCalledTimes(1);

    call.unsubscribe();

    obj.num++;

    expect(callback).toBeCalledTimes(1);

    const callAgain = lazyWatch(reaction, callback);

    callAgain();

    expect(reaction).toBeCalledTimes(2);

    obj.num++;

    expect(callback).toBeCalledTimes(2);
  });

  it('should discover new branches when running manually', () => {
    let dummy;
    let run = false;
    const obj = store<any>({ prop: 'value' });
    const spy = jest.fn(() => {
      dummy = run ? obj.prop : 'other';
    });
    const reaction = lazyWatch(spy, spy);

    expect(dummy).toBe(undefined);
    reaction();
    expect(dummy).toBe('other');
    run = true;
    reaction();
    expect(dummy).toBe('value');
    obj.prop = 'World';
    expect(dummy).toBe('World');
  });
});

describe('lazyWatch - options', () => {
  it('should not run the passed function, if set to true', () => {
    const fnSpy = jest.fn(() => {});
    lazyWatch(fnSpy);
    expect(fnSpy).toBeCalledTimes(0);
  });
});
