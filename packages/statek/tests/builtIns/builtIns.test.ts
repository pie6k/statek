/**
 * @jest-environment jsdom
 */

import { isStore, store } from 'statek';

describe('none observable built-ins', () => {
  it('objects with global constructors should not be converted to observables', () => {
    // @ts-ignore
    window.MyClass = class MyClass {};
    // @ts-ignore
    const obj = new window.MyClass();
    expect(() => {
      const obs = store(obj);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Observable cannot be created from MyClass. Reason - Built in object or accessable in global / window"`,
    );
  });

  it('objects with local constructors should be converted to observables', () => {
    class MyClass {}
    const obj = new MyClass();
    const obs = store(obj);
    expect(obs).not.toBe(obj);
    expect(isStore(obs)).toBe(true);
  });

  it('global objects should be converted to observables', () => {
    // @ts-ignore
    window.obj = {};
    // @ts-ignore
    const obs = store(window.obj);
    // @ts-ignore
    expect(obs).not.toBe(window.obj);
    expect(isStore(obs)).toBe(true);
  });

  it('Date should not be converted to observable', () => {
    expect(() => {
      const date = new Date();

      const obsDate = store(date);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Observable cannot be created from Date. Reason - Built in object or accessable in global / window"`,
    );
  });

  it('RegExp should not be converted to observable', () => {
    expect(() => {
      store(/a/);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Observable cannot be created from RegExp. Reason - Built in object or accessable in global / window"`,
    );
  });

  it('Node should not be converted to observable', () => {
    expect(() => {
      const obsNode = store(document);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Observable cannot be created from Document. Reason - Built in object or accessable in global / window"`,
    );
  });
});
