/**
 * @jest-environment jsdom
 */
import {
  observable,
  watch,
  getObservableRaw,
  lazyWatch,
} from '@statek/core/lib';

describe('observe', () => {
  it('should run the passed function once (wrapped by a reaction)', () => {
    const fnSpy = jest.fn(() => {});
    watch(fnSpy);
    expect(fnSpy).toBeCalledTimes(1);
  });

  it('should observe basic properties', () => {
    let dummy;
    const counter = observable<any>({ num: 0 });
    watch(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    counter.num = 7;
    expect(dummy).toBe(7);
  });

  it('should not call effect when unobserved', () => {
    let dummy;
    const counter = observable<any>({ num: 0 });
    const spy = jest.fn(() => {
      dummy = counter.num;
    });
    const stop = watch(spy);

    expect(spy).toBeCalledTimes(1);
    counter.num = 7;
    expect(spy).toBeCalledTimes(2);
    stop();

    counter.num = 14;
    expect(spy).toBeCalledTimes(2);
  });

  it('should observe multiple properties', () => {
    let dummy;
    const counter = observable<any>({ num1: 0, num2: 0 });
    watch(() => (dummy = counter.num1 + counter.num1 + counter.num2));

    expect(dummy).toBe(0);
    counter.num1 = counter.num2 = 7;
    expect(dummy).toBe(21);
  });

  it('should handle multiple reactions', () => {
    let dummy1, dummy2;
    const counter = observable<any>({ num: 0 });
    watch(() => (dummy1 = counter.num));
    watch(() => (dummy2 = counter.num));

    expect(dummy1).toBe(0);
    expect(dummy2).toBe(0);
    counter.num++;
    expect(dummy1).toBe(1);
    expect(dummy2).toBe(1);
  });

  it('should not call reaction multiple times if watched multiple times', () => {
    const counter = observable({ num: 0 });
    const reaction = jest.fn(() => counter.num);
    watch(reaction);
    watch(reaction);

    expect(reaction).toBeCalledTimes(1);
  });

  it('should observe nested properties', () => {
    let dummy;
    const counter = observable<any>({ nested: { num: 0 } });
    watch(() => (dummy = counter.nested.num));

    expect(dummy).toBe(0);
    counter.nested.num = 8;
    expect(dummy).toBe(8);
  });

  it('should observe delete operations', () => {
    let dummy;
    const obj = observable<any>({ prop: 'value' });
    watch(() => (dummy = obj.prop));

    expect(dummy).toBe('value');
    delete obj.prop;
    expect(dummy).toBe(undefined);
  });

  it('should observe has operations', () => {
    let dummy;
    const obj = observable<any>({ prop: 'value' });
    watch(() => (dummy = 'prop' in obj));

    expect(dummy).toBe(true);
    delete obj.prop;
    expect(dummy).toBe(false);
    obj.prop = 12;
    expect(dummy).toBe(true);
  });

  it('should observe properties on the prototype chain', () => {
    let dummy;
    const counter = observable<any>({ num: 0 });
    const parentCounter = observable<any>({ num: 2 });
    Object.setPrototypeOf(counter, parentCounter);
    watch(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    delete counter.num;
    expect(dummy).toBe(2);
    parentCounter.num = 4;
    expect(dummy).toBe(4);
    counter.num = 3;
    expect(dummy).toBe(3);
  });

  it('should observe has operations on the prototype chain', () => {
    let dummy;
    const counter = observable<any>({ num: 0 });
    const parentCounter = observable<any>({ num: 2 });
    Object.setPrototypeOf(counter, parentCounter);
    watch(() => (dummy = 'num' in counter));

    expect(dummy).toBe(true);
    delete counter.num;
    expect(dummy).toBe(true);
    delete parentCounter.num;
    expect(dummy).toBe(false);
    counter.num = 3;
    expect(dummy).toBe(true);
  });

  it('should observe inherited property accessors', () => {
    let dummy, parentDummy, hiddenValue: any;
    const obj = observable<any>({});
    const parent = observable<any>({
      set prop(value) {
        hiddenValue = value;
      },
      get prop() {
        return hiddenValue;
      },
    });
    Object.setPrototypeOf(obj, parent);
    watch(() => (dummy = obj.prop));
    watch(() => (parentDummy = parent.prop));

    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    obj.prop = 4;
    expect(dummy).toBe(4);
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    parent.prop = 2;
    expect(dummy).toBe(2);
    expect(parentDummy).toBe(2);
  });

  it('should observe function call chains', () => {
    let dummy;
    const counter = observable<any>({ num: 0 });
    watch(() => (dummy = getNum()));

    function getNum() {
      return counter.num;
    }

    expect(dummy).toBe(0);
    counter.num = 2;
    expect(dummy).toBe(2);
  });

  it('should observe iteration', () => {
    let dummy;
    const list = observable<any>(['Hello']);
    watch(() => (dummy = list.join(' ')));

    expect(dummy).toBe('Hello');
    list.push('World!');
    expect(dummy).toBe('Hello World!');
    list.shift();
    expect(dummy).toBe('World!');
  });

  it('should observe implicit array length changes', () => {
    let dummy;
    const list = observable<any>(['Hello']);
    watch(() => (dummy = list.join(' ')));

    expect(dummy).toBe('Hello');
    list[1] = 'World!';
    expect(dummy).toBe('Hello World!');
    list[3] = 'Hello!';
    expect(dummy).toBe('Hello World!  Hello!');
  });

  it('should observe sparse array mutations', () => {
    let dummy;
    const list = observable<any>([]);
    list[1] = 'World!';
    watch(() => (dummy = list.join(' ')));

    expect(dummy).toBe(' World!');
    list[0] = 'Hello';
    expect(dummy).toBe('Hello World!');
    list.pop();
    expect(dummy).toBe('Hello');
  });

  it('should observe enumeration', () => {
    let dummy = 0;
    const numbers = observable<any>({ num1: 3 });
    watch(() => {
      dummy = 0;
      for (let key in numbers) {
        dummy += numbers[key];
      }
    });

    expect(dummy).toBe(3);
    numbers.num2 = 4;
    expect(dummy).toBe(7);
    delete numbers.num1;
    expect(dummy).toBe(4);
  });

  it('should observe symbol keyed properties', () => {
    const key = Symbol('symbol keyed prop');
    let dummy, hasDummy;
    const obj = observable<any>({ [key]: 'value' });
    watch(() => (dummy = obj[key]));
    watch(() => (hasDummy = key in obj));

    expect(dummy).toBe('value');
    expect(hasDummy).toBe(true);
    obj[key] = 'newValue';
    expect(dummy).toBe('newValue');
    delete obj[key];
    expect(dummy).toBe(undefined);
    expect(hasDummy).toBe(false);
  });

  it('should not observe well-known symbol keyed properties', () => {
    const key = Symbol.isConcatSpreadable;
    let dummy;
    const array = observable<any>([]);
    watch(() => (dummy = array[key]));

    expect(array[key]).toBe(undefined);
    expect(dummy).toBe(undefined);
    array[key] = true;
    expect(array[key]).toBe(true);
    expect(dummy).toBe(undefined);
  });

  it('should observe function valued properties', () => {
    const oldFunc = () => {};
    const newFunc = () => {};

    let dummy;
    const obj = observable<any>({ func: oldFunc });
    watch(() => (dummy = obj.func));

    expect(dummy).toBe(oldFunc);
    obj.func = newFunc;
    expect(dummy).toBe(newFunc);
  });

  it('should not observe set operations without a value change', () => {
    let hasDummy, getDummy;
    const obj = observable<any>({ prop: 'value' });

    const getSpy = jest.fn(() => (getDummy = obj.prop));
    const hasSpy = jest.fn(() => (hasDummy = 'prop' in obj));
    watch(getSpy);
    watch(hasSpy);

    expect(getDummy).toBe('value');
    expect(hasDummy).toBe(true);
    obj.prop = 'value';
    expect(getSpy).toBeCalledTimes(1);
    expect(hasSpy).toBeCalledTimes(1);
    expect(getDummy).toBe('value');
    expect(hasDummy).toBe(true);
  });

  it('should not observe raw mutations', () => {
    let dummy;

    const obj = observable<any>({});
    watch(() => (dummy = getObservableRaw(obj).prop));

    expect(dummy).toBe(undefined);
    obj.prop = 'value';
    expect(dummy).toBe(undefined);
  });

  it('should not be triggered by raw mutations', () => {
    let dummy;

    const obj = observable<any>({});
    watch(() => (dummy = obj.prop));

    expect(dummy).toBe(undefined);
    getObservableRaw(obj).prop = 'value';
    expect(dummy).toBe(undefined);
  });

  it('should not be triggered by inherited raw setters', () => {
    let dummy, parentDummy, hiddenValue: any;
    const obj = observable<any>({});
    const parent = observable<any>({
      set prop(value) {
        hiddenValue = value;
      },
      get prop() {
        return hiddenValue;
      },
    });
    Object.setPrototypeOf(obj, parent);
    watch(() => (dummy = obj.prop));
    watch(() => (parentDummy = parent.prop));

    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    getObservableRaw(obj).prop = 4;
    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
  });

  it('should avoid implicit infinite recursive loops with itself', () => {
    const counter = observable({ num: 0 });

    const counterSpy = jest.fn(() => counter.num++);
    watch(counterSpy);
    expect(counter.num).toBe(1);
    expect(counterSpy).toBeCalledTimes(1);
    counter.num = 4;
    expect(counter.num).toBe(5);
    expect(counterSpy).toBeCalledTimes(2);
  });

  it('should allow explicitly recursive raw function loops', () => {
    const counter = observable<any>({ num: 0 });

    // TODO: this should be changed to reaction loops, can it be done?
    const numSpy = jest.fn(() => {
      counter.num++;
      if (counter.num < 10) {
        numSpy();
      }
    });
    watch(numSpy);

    expect(counter.num).toBe(10);
    expect(numSpy).toBeCalledTimes(10);
  });

  it('should avoid infinite loops with other reactions', () => {
    const nums = observable<any>({ num1: 0, num2: 1 });

    const spy1 = jest.fn(() => (nums.num1 = nums.num2));
    const spy2 = jest.fn(() => (nums.num2 = nums.num1));
    watch(spy1);
    watch(spy2);
    expect(nums.num1).toBe(1);
    expect(nums.num2).toBe(1);
    expect(spy1).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(1);
    nums.num2 = 4;
    expect(nums.num1).toBe(4);
    expect(nums.num2).toBe(4);
    expect(spy1).toBeCalledTimes(2);
    expect(spy2).toBeCalledTimes(2);
    nums.num1 = 10;
    expect(nums.num1).toBe(10);
    expect(nums.num2).toBe(10);
    expect(spy1).toBeCalledTimes(3);
    expect(spy2).toBeCalledTimes(3);
  });

  it('should return a new reactive version of the function', () => {
    function greet() {
      return 'Hello World';
    }
    const reaction1 = watch(greet);
    const reaction2 = watch(greet);
    expect(reaction1).toBeInstanceOf(Function);
    expect(reaction2).toBeInstanceOf(Function);
    expect(reaction1).not.toBe(greet);
    expect(reaction1).not.toBe(reaction2);
  });

  it('should wrap the passed function seamlessly', () => {
    function greet() {
      return `Hello`;
    }
    const reaction = lazyWatch(greet);

    expect(reaction()).toBe('Hello');
  });

  it('should properly pass context', () => {
    let dummy: any;
    function greet(this: any) {
      dummy = this;
      return `Hello`;
    }
    watch(greet, { context: 'foo' });

    expect(dummy).toBe('foo');
  });

  it('should inform lazy watch about deps change, but not run it again', () => {
    let dummy: string = '';
    const obj = observable({ prop: 'foo' });

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

  it('should properly watch classes', () => {
    class Foo {
      foo = 1;
      bar = {
        baz: 2,
      };
    }

    const obs = observable(new Foo());
    const spy = jest.fn(() => {
      obs.foo;
      obs.bar.baz;
    });

    watch(spy);

    expect(spy).toBeCalledTimes(1);

    obs.foo++;

    expect(spy).toBeCalledTimes(2);

    obs.bar.baz++;

    expect(spy).toBeCalledTimes(3);
  });

  it('should properly pass context to lazyWatch', () => {
    let dummy: any;
    function greet(this: any) {
      dummy = this;
      return `Hello`;
    }
    const call = lazyWatch(greet, () => {}, 'foo');

    call();

    expect(dummy).toBe('foo');
  });

  it('should not allow lazywatch to be called when unsubscribed', () => {
    const obj = observable({ prop: 'foo' });
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
    const obj = observable({ prop: 'foo' });
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
    const obj = observable({ prop: 'foo' });
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
    const obj = observable({ num: 0 });
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

  it('should discover new branches while running automatically', () => {
    let dummy: string = '';
    const obj = observable({ prop: 'value', run: false });

    const conditionalSpy = jest.fn(() => {
      dummy = obj.run ? obj.prop : 'other';
    });
    watch(conditionalSpy);

    expect(dummy).toBe('other');
    expect(conditionalSpy).toBeCalledTimes(1);
    obj.prop = 'Hi';
    expect(dummy).toBe('other');
    expect(conditionalSpy).toBeCalledTimes(1);
    obj.run = true;
    expect(dummy).toBe('Hi');
    expect(conditionalSpy).toBeCalledTimes(2);
    obj.prop = 'World';
    expect(dummy).toBe('World');
    expect(conditionalSpy).toBeCalledTimes(3);
  });

  it('should discover new branches when running manually', () => {
    let dummy;
    let run = false;
    const obj = observable<any>({ prop: 'value' });
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

  it('should not be triggered by mutating a property, which is used in an inactive branch', () => {
    let dummy: string = '';
    const obj = observable({ prop: 'value', run: true });

    const conditionalSpy = jest.fn(() => {
      dummy = obj.run ? obj.prop : 'other';
    });
    watch(conditionalSpy);

    expect(dummy).toBe('value');
    expect(conditionalSpy).toBeCalledTimes(1);
    obj.run = false;
    expect(dummy).toBe('other');
    expect(conditionalSpy).toBeCalledTimes(2);
    obj.prop = 'value2';
    expect(dummy).toBe('other');
    expect(conditionalSpy).toBeCalledTimes(2);
  });

  it('should not run multiple times for a single mutation', () => {
    let dummy;

    const spy = jest.fn(() => {
      for (const key in obj) {
        dummy = obj[key];
      }
      dummy = obj.prop;
    });
    const obj = observable<any>({});

    watch(spy);

    expect(spy).toBeCalledTimes(1);
    obj.prop = 16;
    expect(dummy).toBe(16);
    expect(spy).toBeCalledTimes(2);
  });

  it('should allow nested reactions', () => {
    const nums = observable({ num1: 0, num2: 1, num3: 2 });
    const dummy: any = {};

    const childSpy = jest.fn(() => (dummy.num1 = nums.num1));
    const childReaction = lazyWatch(childSpy, childSpy);
    const parentSpy = jest.fn(() => {
      dummy.num2 = nums.num2;
      childReaction();
      dummy.num3 = nums.num3;
    });
    watch(parentSpy);

    expect(dummy).toEqual({ num1: 0, num2: 1, num3: 2 });
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(1);
    // this should only call the childReaction
    nums.num1 = 4;
    expect(dummy).toEqual({ num1: 4, num2: 1, num3: 2 });
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(2);
    // this calls the parentReaction, which calls the childReaction once
    nums.num2 = 10;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 2 });
    expect(parentSpy).toBeCalledTimes(2);
    expect(childSpy).toBeCalledTimes(3);
    // this calls the parentReaction, which calls the childReaction once
    nums.num3 = 7;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 7 });
    expect(parentSpy).toBeCalledTimes(3);
    expect(childSpy).toBeCalledTimes(4);
  });
});

describe('options', () => {
  describe('lazy', () => {
    it('should not run the passed function, if set to true', () => {
      const fnSpy = jest.fn(() => {});
      lazyWatch(fnSpy);
      expect(fnSpy).toBeCalledTimes(0);
    });

    it('should default to false', () => {
      const fnSpy = jest.fn(() => {});
      watch(fnSpy);
      expect(fnSpy).toBeCalledTimes(1);
    });
  });

  describe('scheduler', () => {
    it('should call the scheduler function with the reaction instead of running it sync', () => {
      const counter = observable({ num: 0 });
      const observeSpy = jest.fn(() => {
        counter.num;
      });
      const scheduler = jest.fn(() => {});
      watch(observeSpy, { scheduler });

      expect(observeSpy).toBeCalledTimes(1);
      expect(scheduler).toBeCalledTimes(0);
      counter.num++;
      expect(observeSpy).toBeCalledTimes(1);
      expect(scheduler).toBeCalledTimes(1);
    });
  });

  it('should not error when a DOM element is added', async () => {
    let dummy = null;
    const observed = observable<any>({ obj: null });
    watch(() => (dummy = observed.obj && observed.obj.nodeType));

    expect(dummy).toBe(null);
    observed.obj = document;
    expect(dummy).toBe(9);
  });
});
