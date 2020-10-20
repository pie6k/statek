import { useRef } from 'react';

type MaybeArray<T> = T | T[];

export function convertMaybeArrayToArra<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }

  return [input];
}

export function useArrayMemo<T>(input: T[]) {
  const memoizedArrayRef = useRef<T[]>(input);

  if (!areArraysEqual(input, memoizedArrayRef.current)) {
    memoizedArrayRef.current = input;
  }

  return memoizedArrayRef.current;
}

function areArraysEqual<T>(a: T[], b: T[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((item, index) => {
    return b[index] === item;
  });
}
