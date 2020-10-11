import { observable, observe } from '@statek/core/lib/observable';
import { spy } from './utils';

describe('unobserve', () => {
  it('should unobserve the observed function', () => {
    let dummy;
    const counter = observable({ num: 0 });
    const counterSpy = spy(() => (dummy = counter.num));
    const reaction = observe(counterSpy);

    expect(counterSpy.callCount).toBe(1);
    // @ts-expect-error
    counter.num = 'Hello';
    expect(counterSpy.callCount).toBe(2);
    expect(dummy).toBe('Hello');
    reaction.unsubscribe();
    // @ts-expect-error
    counter.num = 'World';
    expect(counterSpy.callCount).toBe(2);
    expect(dummy).toBe('Hello');
  });

  it('should unobserve when the same key is used multiple times', () => {
    let dummy;
    const user = observable({ name: { name: 'Bob' } });
    const nameSpy = spy(() => (dummy = user.name.name));
    const reaction = observe(nameSpy);

    expect(nameSpy.callCount).toBe(1);
    user.name.name = 'Dave';
    expect(nameSpy.callCount).toBe(2);
    expect(dummy).toBe('Dave');
    reaction.unsubscribe();
    user.name.name = 'Ann';
    expect(nameSpy.callCount).toBe(2);
    expect(dummy).toBe('Dave');
  });

  it('should unobserve multiple reactions for the same target and key', () => {
    let dummy;
    const counter = observable({ num: 0 });

    const reaction1 = observe(() => (dummy = counter.num));
    const reaction2 = observe(() => (dummy = counter.num));
    const reaction3 = observe(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    reaction1.unsubscribe();
    reaction2.unsubscribe();
    reaction3.unsubscribe();
    counter.num++;
    expect(dummy).toBe(0);
  });

  it('should not reobserve unobserved reactions on manual execution', () => {
    let dummy;

    const obj = observable<any>({});
    const reaction = observe(() => (dummy = obj.prop));

    expect(dummy).toBe(undefined);
    reaction.unsubscribe();
    reaction();
    obj.prop = 12;
    expect(dummy).toBe(undefined);
  });

  it('should have the same effect, when called multiple times', () => {
    let dummy;
    const counter = observable<any>({ num: 0 });
    const counterSpy = spy(() => (dummy = counter.num));
    const reaction = observe(counterSpy);

    expect(counterSpy.callCount).toBe(1);
    counter.num = 'Hello';
    expect(counterSpy.callCount).toBe(2);
    expect(dummy).toBe('Hello');
    reaction.unsubscribe();
    reaction.unsubscribe();
    reaction.unsubscribe();
    counter.num = 'World';
    expect(counterSpy.callCount).toBe(2);
    expect(dummy).toBe('Hello');
  });
});
