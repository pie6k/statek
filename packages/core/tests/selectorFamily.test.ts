import {
  isStore,
  store,
  watch,
  getStoreRaw,
  selector,
  selectorFamily,
} from '@statek/core/lib';

describe('selectorFamily', () => {
  it('should only run selector watch if its value changed', () => {
    const obs = store({ text: 'Hello' });

    const selectorSpy = jest.fn((name: string) => {
      return `${obs.text}, ${name}!`;
    });

    const greeting = selectorFamily(selectorSpy);

    const spy = jest.fn(() => {
      return greeting.get('Bob');
    });

    const spy2 = jest.fn(() => {
      return greeting.get('Tom');
    });

    const stop1 = watch(spy);
    const stop2 = watch(spy2);

    expect(spy).toHaveLastReturnedWith('Hello, Bob!');
    expect(spy2).toHaveLastReturnedWith('Hello, Tom!');

    obs.text = 'Hi';

    expect(spy).toHaveLastReturnedWith('Hi, Bob!');
    expect(spy2).toHaveLastReturnedWith('Hi, Tom!');

    expect(selectorSpy).toBeCalledTimes(4);

    stop1();
    stop2();

    obs.text = 'Yo';

    expect(selectorSpy).toBeCalledTimes(4);
  });

  it('should return the same selector for equal args', () => {
    const selector = selectorFamily((name: string) => name);

    expect(selector.get('foo')).toBe(selector.get('foo'));
  });

  it('should return the same selector for equal complex args', () => {
    const selector = selectorFamily((name: any) => name);

    expect(selector.get({ foo: 'foo' })).toBe(selector.get({ foo: 'foo' }));
  });

  it('should throw when using non-serializable arguments', () => {
    const selector = selectorFamily((name: any) => name);

    expect(() => {
      selector.get(/a/);
    }).toThrowErrorMatchingInlineSnapshot(
      `"It is not possible to serialize provided value"`,
    );
  });
});
