import React from 'react';

interface SimpleRef<T = any> {
  current: T;
}

interface Internals {
  ReactCurrentOwner: SimpleRef<Fiber | null>;
}

export interface Fiber {
  type: any;
}

// :P it looks better now!
const internalsKey = reverseString(
  'DERIF_EB_LLIW_UOY_RO_ESU_TON_OD_SLANRETNI_TERCES__',
);

// @ts-ignore;
const internals = React[internalsKey] as Internals;

export function getCurrentFiber() {
  return internals.ReactCurrentOwner.current;
}

export function isAnyComponentRendering() {
  return !!getCurrentFiber();
}

function reverseString(input: string) {
  return input.split('').reverse().join('');
}
