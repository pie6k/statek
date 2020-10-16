import { store, watch } from '@statek/core/lib';
import { watchWarn } from './utils';

describe('stop reaction', () => {
  it('stopped watching function should not be called on changes', () => {
    let dummy;
    const counter = store({ num: 0 });
    const counterSpy = jest.fn(() => (dummy = counter.num));
    const stop = watch(counterSpy);

    expect(counterSpy).toBeCalledTimes(1);

    counter.num++;
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe(1);
    stop();

    counter.num++;
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe(1);
  });

  it('should stop when the same key is used multiple times', () => {
    let dummy;
    const user = store({ name: { name: 'Bob' } });
    const nameSpy = jest.fn(() => (dummy = user.name.name));
    const stop = watch(nameSpy);

    expect(nameSpy).toBeCalledTimes(1);
    user.name.name = 'Dave';
    expect(nameSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Dave');
    stop();
    user.name.name = 'Ann';
    expect(nameSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Dave');
  });

  it('should unobserve multiple reactions for the same target and key', () => {
    let dummy;
    const counter = store({ num: 0 });

    const stop1 = watch(() => (dummy = counter.num));
    const stop2 = watch(() => (dummy = counter.num));
    const stop3 = watch(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    stop1();
    stop2();
    stop3();
    counter.num++;
    expect(dummy).toBe(0);
  });

  it('should not reobserve unobserved reactions on manual execution', () => {
    let dummy;

    const obj = store<any>({});
    const stop = watch(() => (dummy = obj.prop));

    expect(dummy).toBe(undefined);
    stop();
    obj.prop = 12;
    expect(dummy).toBe(undefined);
  });

  it('should have the same effect, when called multiple times', () => {
    let dummy;
    const counter = store<any>({ num: 0 });
    const counterSpy = jest.fn(() => (dummy = counter.num));
    const stop = watch(counterSpy);

    expect(counterSpy).toBeCalledTimes(1);
    counter.num = 'Hello';
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Hello');
    const warn = watchWarn();
    stop();
    stop();
    stop();
    expect(warn.count()).toBe(2);
    counter.num = 'World';
    stop();
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Hello');
  });

  it('should restore stopped reaction if watch called again', () => {
    const counter = store({ num: 0 });
    const counterSpy = jest.fn(() => counter.num);
    const stop = watch(counterSpy);

    expect(counterSpy).toBeCalledTimes(1);
    counter.num++;
    expect(counterSpy).toBeCalledTimes(2);
    stop();

    counter.num++;
    expect(counterSpy).toBeCalledTimes(2);

    watch(counterSpy);

    expect(counterSpy).toBeCalledTimes(3);

    counter.num++;

    expect(counterSpy).toBeCalledTimes(4);
  });
});
