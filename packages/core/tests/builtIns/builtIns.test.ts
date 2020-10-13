/**
 * @jest-environment jsdom
 */

import { isStore, store } from '@statek/core/lib';

describe('none observable built-ins', () => {
  it('objects with global constructors should not be converted to observables', () => {
    // @ts-ignore
    window.MyClass = class MyClass {};
    // @ts-ignore
    const obj = new window.MyClass();
    const obs = store(obj);
    expect(obs).toBe(obj);
    expect(isStore(obs)).toBe(false);
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
    const date = new Date();
    const obsDate = store(date);
    expect(obsDate).toBe(date);
    expect(isStore(obsDate)).toBe(false);
  });

  it('RegExp should not be converted to observable', () => {
    const regex = new RegExp('/a/');
    const obsRegex = store(regex);
    expect(obsRegex).toBe(regex);
    expect(isStore(obsRegex)).toBe(false);
  });

  it('Node should not be converted to observable', () => {
    const node = document;
    const obsNode = store(node);
    expect(obsNode).toBe(node);
    expect(isStore(obsNode)).toBe(false);
  });
});
