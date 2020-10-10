import { useState } from 'react';

// try to find the global object
// it is window in the DOM and global in NodeJS and React Native
const isDOM = typeof window !== 'undefined';
const isNative = typeof global !== 'undefined';

export const globalObj: typeof globalThis = (isDOM
  ? window
  : isNative
  ? global
  : undefined) as any;

export function typedOwnPropertyNames<T>(obj: T): Array<keyof T> {
  return Object.getOwnPropertyNames(obj) as Array<keyof T>;
}

export function isSymbol(t: any): t is Symbol {
  return typeof t === 'symbol';
}
