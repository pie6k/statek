import { observableToRawMap, rawToObservableMap } from './internals';
import { registerNewObservable, MutationOperationInfo } from './store';
import { getProxyHandlers, shouldInstrument } from './builtIns';
import { baseProxyHandlers } from './handlers';

export function observable<T extends object>(initialStateOrObservable: T): T {
  if (!initialStateOrObservable) {
    throw new Error('Observable source must by an object');
  }
  // if it is already an observable or it should not be wrapped, return it
  if (observableToRawMap.has(initialStateOrObservable)) {
    return initialStateOrObservable;
  }
  if (!shouldInstrument(initialStateOrObservable as any)) {
    return initialStateOrObservable;
  }
  // if it already has a cached observable wrapper, return it
  // otherwise create a new observable
  return (
    rawToObservableMap.get(initialStateOrObservable as object) ||
    createObservable(initialStateOrObservable)
  );
}

function createObservable<T extends object>(rawObject: T): T {
  // if it is a complex built-in object or a normal object, wrap it
  const handlers = getProxyHandlers(rawObject) ?? baseProxyHandlers;

  const observable = new Proxy(rawObject, handlers);
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
  return observableToRawMap.get(obj as any)!;
}
