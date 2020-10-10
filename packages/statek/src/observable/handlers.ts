import { lazyCreateObservable } from './observable';
import { observableToRawMap, rawToObservableMap } from './internals';
import {
  handleObservableReadOperation,
  handleObservableMutationOperation,
} from './reactionRunner';
import { isSymbol, typedOwnPropertyNames } from '../utils';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const wellKnownSymbols = new Set<Symbol>(
  typedOwnPropertyNames(Symbol)
    .map(key => {
      return Symbol[key];
    })
    .filter(isSymbol),
);

// intercept get operations on observables to know which reaction uses their properties
export const baseProxyHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    const result = Reflect.get(target, key, receiver);

    // do not register (observable.prop -> reaction) pairs for well known symbols
    // these symbols are frequently retrieved in low level JavaScript under the hood
    if (typeof key === 'symbol' && wellKnownSymbols.has(key)) {
      return result;
    }
    // register and save (observable.prop -> runningReaction)
    handleObservableReadOperation({
      target,
      key,
      type: 'get',
    });

    // do not violate the none-configurable none-writable prop get handler invariant
    // fall back to none reactive mode in this case, instead of letting the Proxy throw a TypeError
    const descriptor = Reflect.getOwnPropertyDescriptor(target, key);

    if (descriptor?.writable === false && descriptor.configurable === false) {
      return result;
    }

    // if we are inside a reaction and observable.prop is an object wrap it in an observable too
    // this is needed to intercept property access on that object too (dynamic observable tree)
    return lazyCreateObservable(result);
  },

  has(target, key) {
    // register and save (observable.prop -> runningReaction)
    handleObservableReadOperation({ target, key, type: 'has' });
    return Reflect.has(target, key);
  },

  ownKeys(target) {
    handleObservableReadOperation({ target, type: 'iterate' });
    return Reflect.ownKeys(target);
  },

  // intercept set operations on observables to know when to trigger reactions
  set(target, key, value, receiver) {
    // make sure to do not pollute the raw object with observables
    if (typeof value === 'object' && value !== null) {
      value = observableToRawMap.get(value) || value;
    }
    // save if the object had a descriptor for this key
    const hadKey = hasOwnProperty.call(target, key);
    // save if the value changed because of this set operation
    const oldValue = (target as any)[key];
    // execute the set operation before running any reaction
    const result = Reflect.set(target, key, value, receiver);

    // do not queue reactions if the target of the operation is not the raw receiver
    // (possible because of prototypal inheritance)
    if (target !== observableToRawMap.get(receiver)) {
      return result;
    }

    // queue a reaction if it's a new property or its value changed
    if (!hadKey) {
      handleObservableMutationOperation({
        target,
        key,
        value,
        type: 'add',
      });
      return result;
    }

    if (value !== oldValue) {
      handleObservableMutationOperation({
        target,
        key,
        value,
        type: 'set',
      });
    }
    return result;
  },

  deleteProperty(target, key) {
    // save if the object had the key
    const hadKey = hasOwnProperty.call(target, key);
    // execute the delete operation before running any reaction
    const result = Reflect.deleteProperty(target, key);

    // only queue reactions for delete operations which resulted in an actual change
    if (hadKey) {
      handleObservableMutationOperation({
        target,
        key,
        type: 'delete',
      });
    }
    return result;
  },
};
