import React from 'react';

/**
 * This part is experimental and can break as it's using undocumented React features.
 *
 * For hooks - we're not digging deep. We only want to connect useForceUpdate hook
 * with currently rendering functional component instance (React Fiber). This is all we need.
 *
 * For class components - we'll pick 'forceUpdate' function from currently rendered React Class
 * component (in classFiberUpdater.ts) instance in order to be able to perform updates without any
 * additional changes required in component itself.
 */
interface SimpleRef<T = any> {
  current: T;
}

interface Internals {
  ReactCurrentOwner: SimpleRef<Fiber | null>;
}

export interface Fiber {
  // We'll need type of current fiber to detect if it's class or functional component
  type: any;
  stateNode: any;
}

// :P it looks better now!
const internalsKey = reverseString(
  'DERIF_EB_LLIW_UOY_RO_ESU_TON_OD_SLANRETNI_TERCES__',
);

// @ts-ignore
const internals = React[internalsKey] as Internals;

export function getCurrentFiber() {
  return internals.ReactCurrentOwner.current;
}

/**
 * We'll use it only to warn in DEV mode if any part of any reactive store is accessed inside functional
 * component that is not wrapped in view or is not using `useObserve` hook.
 *
 * Using reactive store in unreactive functional components can seem to work just fine, but might
 * lead to ward to find bugs (eg. after you wrap some component in memo).
 */
export function isAnyComponentRendering() {
  return !!internals.ReactCurrentOwner.current;
}

function reverseString(input: string) {
  return input.split('').reverse().join('');
}
