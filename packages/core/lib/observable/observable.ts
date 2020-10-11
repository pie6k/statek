import { observableToRawMap, rawToObservableMap } from './internals';
import { registerNewObservable, MutationOperationInfo } from './store';
import { getBuiltInTypeProxyHandlers, canWrapInProxy } from './builtIns';
import { baseProxyHandlers } from './handlers';
import { isAnyReactionRunning } from './reactionRunner';

export function observable<T extends object>(initialStateOrObservable: T): T {
  if (!initialStateOrObservable) {
    throw new Error('Observable source must by an object');
  }
  // if it is already an observable or it should not be wrapped, return it
  if (observableToRawMap.has(initialStateOrObservable)) {
    return initialStateOrObservable;
  }

  if (!canWrapInProxy(initialStateOrObservable)) {
    return initialStateOrObservable;
  }

  // if it already has a cached observable wrapper, return it
  // otherwise create a new observable
  return (
    rawToObservableMap.get(initialStateOrObservable) ||
    createObservable(initialStateOrObservable)
  );
}

export function lazyCreateObservable(rawObject: object) {
  const observableObj = rawToObservableMap.get(rawObject);

  // If we have observable already created - always return it
  if (observableObj) {
    return observableObj;
  }

  // Observable is not yet created.

  // If we're not during reaction - no point in creating observable. Return raw object.
  if (!isAnyReactionRunning()) {
    return rawObject;
  }

  // If it's possible to create observable (it's not primitive) - create it.
  if (typeof rawObject === 'object' && rawObject !== null) {
    return observable(rawObject);
  }

  // Value is primitive - return raw value.
  return rawObject;
}

function createObservable<T extends object>(rawObject: T): T {
  // if it is a complex built-in object or a normal object, wrap it
  const proxyHandlers =
    getBuiltInTypeProxyHandlers(rawObject) ?? baseProxyHandlers;

  const observable = new Proxy(rawObject, proxyHandlers);
  // save these to switch between the raw object and the wrapped object with ease later
  rawToObservableMap.set(rawObject, observable);
  observableToRawMap.set(observable, rawObject);
  // init basic data structures to save and cleanup later (observable.prop -> reaction) connections
  registerNewObservable(rawObject);

  return observable;
}

export function isObservable(obj: object) {
  return observableToRawMap.has(obj);
}

export function getObservableRaw<T extends object>(obj: T): T {
  if (!isObservable(obj)) {
    throw new Error(
      'trying to get raw object from input that is not observable',
    );
  }

  return observableToRawMap.get(obj)!;
}
