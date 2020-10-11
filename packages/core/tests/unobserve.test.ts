import { observable, watch } from '@statek/core/lib';

describe('unobserve', () => {
  it('should unobserve the observed function', () => {
    let dummy;
    const counter = observable({ num: 0 });
    const counterSpy = jest.fn(() => (dummy = counter.num));
    const stop = watch(counterSpy);

    expect(counterSpy).toBeCalledTimes(1);
    // @ts-expect-error
    counter.num = 'Hello';
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Hello');
    stop();
    // @ts-expect-error
    counter.num = 'World';
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Hello');
  });

  it('should unobserve when the same key is used multiple times', () => {
    let dummy;
    const user = observable({ name: { name: 'Bob' } });
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
    const counter = observable({ num: 0 });

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

    const obj = observable<any>({});
    const stop = watch(() => (dummy = obj.prop));

    expect(dummy).toBe(undefined);
    stop();
    stop();
    obj.prop = 12;
    expect(dummy).toBe(undefined);
  });

  it('should have the same effect, when called multiple times', () => {
    let dummy;
    const counter = observable<any>({ num: 0 });
    const counterSpy = jest.fn(() => (dummy = counter.num));
    const stop = watch(counterSpy);

    expect(counterSpy).toBeCalledTimes(1);
    counter.num = 'Hello';
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Hello');
    stop();
    stop();
    stop();
    counter.num = 'World';
    expect(counterSpy).toBeCalledTimes(2);
    expect(dummy).toBe('Hello');
  });
});
