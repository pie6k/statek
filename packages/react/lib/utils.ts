// import { useState } from 'react';

import { useMethod } from './useMethod';

// // try to find the global object
// // it is window in the DOM and global in NodeJS and React Native
// const isDOM = typeof window !== 'undefined';
// const isNative = typeof global !== 'undefined';

// export const globalObj: typeof globalThis = (isDOM
//   ? window
//   : isNative
//   ? global
//   : undefined) as any;

// export function typedOwnPropertyNames<T>(obj: T): Array<keyof T> {
//   return Object.getOwnPropertyNames(obj) as Array<keyof T>;
// }

// export function isSymbol(t: any): t is Symbol {
//   return typeof t === 'symbol';
// }

// export function mapGetOrCreate<K, V>(
//   map: Map<K, V> | (K extends object ? WeakMap<K, V> : never),
//   key: K,
//   value: () => V,
// ): V {
//   if (map.has(key)) {
//     return map.get(key)!;
//   }

//   const newValue = value();

//   map.set(key, newValue);

//   return newValue;
// }

export function useUnmount(callback: () => void) {
  const callbackRef = useMethod(callback);
}

const didWarnSet = new Set<any>();

export function warnOnce(pointer: any, ...args: any[]) {
  if (didWarnSet.has(pointer)) {
    return;
  }

  didWarnSet.add(pointer);

  console.warn(...args);
}

export function getComponentTypeNiceName(type: any) {
  if (!type) {
    return 'Unknown';
  }

  return type?.displayName ?? type?.name ?? 'Unknown';
}
