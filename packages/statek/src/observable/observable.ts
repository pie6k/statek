import { registeredObservablesMap, rawToObservableMap } from './internals';
import {
  registerNewObservable,
  OperationInfo,
  ObservableOptions,
} from './store';
import { getProxyHandlers, shouldInstrument } from './builtIns';
import { baseProxyHandlers } from './handlers';

export function observable<T extends object>(
  initialStateOrObservable: T,
  options?: ObservableOptions,
): T {
  if (!initialStateOrObservable) {
    throw new Error('Observable source must by an object');
  }
  // if it is already an observable or it should not be wrapped, return it
  if (registeredObservablesMap.has(initialStateOrObservable)) {
    return initialStateOrObservable;
  }
  if (!shouldInstrument(initialStateOrObservable as any)) {
    return initialStateOrObservable;
  }
  // if it already has a cached observable wrapper, return it
  // otherwise create a new observable
  return (
    rawToObservableMap.get(initialStateOrObservable as object) ||
    createObservable(initialStateOrObservable, options)
  );
}

function createObservable<T extends object>(
  rawObject: T,
  options?: ObservableOptions,
): T {
  // if it is a complex built-in object or a normal object, wrap it
  const handlers = getProxyHandlers(rawObject) ?? baseProxyHandlers;

  const observable = new Proxy(rawObject, handlers);
  // save these to switch between the raw object and the wrapped object with ease later
  rawToObservableMap.set(rawObject, observable);
  registeredObservablesMap.set(observable, rawObject);
  // init basic data structures to save and cleanup later (observable.prop -> reaction) connections
  registerNewObservable(rawObject, options);

  return observable;
}

export function isObservable(obj: object) {
  return registeredObservablesMap.has(obj);
}

export function getObservableRaw<T extends object>(obj: T): T {
  if (!isObservable(obj)) {
    throw new Error(
      'trying to get raw object from input that is not observable',
    );
  }
  return registeredObservablesMap.get(obj as any)!;
}
