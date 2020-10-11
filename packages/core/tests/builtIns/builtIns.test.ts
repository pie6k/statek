/**
 * @jest-environment jsdom
 */

import { isObservable, observable } from '@statek/core/lib';

describe('none observable built-ins', () => {
  it('objects with global constructors should not be converted to observables', () => {
    // @ts-ignore
    window.MyClass = class MyClass {};
    // @ts-ignore
    const obj = new window.MyClass();
    const obs = observable(obj);
    expect(obs).toBe(obj);
    expect(isObservable(obs)).toBe(false);
  });

  it('objects with local constructors should be converted to observables', () => {
    class MyClass {}
    const obj = new MyClass();
    const obs = observable(obj);
    expect(obs).not.toBe(obj);
    expect(isObservable(obs)).toBe(true);
  });

  it('global objects should be converted to observables', () => {
    // @ts-ignore
    window.obj = {};
    // @ts-ignore
    const obs = observable(window.obj);
    // @ts-ignore
    expect(obs).not.toBe(window.obj);
    expect(isObservable(obs)).toBe(true);
  });

  it('Date should not be converted to observable', () => {
    const date = new Date();
    const obsDate = observable(date);
    expect(obsDate).toBe(date);
    expect(isObservable(obsDate)).toBe(false);
  });

  it('RegExp should not be converted to observable', () => {
    const regex = new RegExp('/a/');
    const obsRegex = observable(regex);
    expect(obsRegex).toBe(regex);
    expect(isObservable(obsRegex)).toBe(false);
  });

  it('Node should not be converted to observable', () => {
    const node = document;
    const obsNode = observable(node);
    expect(obsNode).toBe(node);
    expect(isObservable(obsNode)).toBe(false);
  });
});
