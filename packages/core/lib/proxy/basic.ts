import { createChildStoreIfNeeded, storeToRawMap } from '../store';
import {
  handleStoreMutationOperation,
  handleStoreReadOperation,
  ReadOperationInfo,
} from '../operations';
import { isSymbol, typedOwnPropertyNames } from '../utils';
import { createIterationCallback } from './utils';

const hasOwnProperty = Object.prototype.hasOwnProperty;
export const wellKnownSymbols = new Set<Symbol>(
  typedOwnPropertyNames(Symbol)
    .map(key => {
      return Symbol[key];
    })
    .filter(isSymbol),
);

// intercept get operations on observables to know which reaction uses their properties
export const basicProxyHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    const result = Reflect.get(target, key, receiver);

    // do not register (observable.prop -> reaction) pairs for well known symbols
    // these symbols are frequently retrieved in low level JavaScript under the hood
    if (typeof key === 'symbol' && wellKnownSymbols.has(key)) {
      return result;
    }

    const operation: ReadOperationInfo = {
      target,
      key,
      type: 'get',
    };

    // register and save (observable.prop -> runningReaction)
    handleStoreReadOperation(operation);

    // do not violate the none-configurable none-writable prop get handler invariant
    // fall back to none reactive mode in this case, instead of letting the Proxy throw a TypeError
    const descriptor = Reflect.getOwnPropertyDescriptor(target, key);

    if (descriptor?.writable === false && descriptor.configurable === false) {
      return result;
    }

    // if we are inside a reaction and observable.prop is an object wrap it in an observable too
    // this is needed to intercept property access on that object too (dynamic observable tree)
    return createChildStoreIfNeeded(result, target, operation);
  },

  has(target, key) {
    // register and save (observable.prop -> runningReaction)
    handleStoreReadOperation({ target, key, type: 'has' });
    return Reflect.has(target, key);
  },

  ownKeys(target) {
    handleStoreReadOperation({ target, type: 'iterate' });
    return Reflect.ownKeys(target);
  },

  // intercept set operations on observables to know when to trigger reactions
  set(target, key, value, receiver) {
    // make sure to do not pollute the raw object with observables
    if (typeof value === 'object' && value !== null) {
      value = storeToRawMap.get(value) || value;
    }
    // save if the object had a descriptor for this key
    const hadKey = hasOwnProperty.call(target, key);
    // save if the value changed because of this set operation
    const oldValue = (target as any)[key];
    // execute the set operation before running any reaction
    const result = Reflect.set(target, key, value, receiver);
    // do not queue reactions if the target of the operation is not the raw receiver
    // (possible because of prototypal inheritance)
    if (target !== storeToRawMap.get(receiver)) {
      return result;
    }

    // queue a reaction if it's a new property or its value changed
    if (!hadKey) {
      handleStoreMutationOperation({
        target,
        key,
        value,
        type: 'add',
      });
      return result;
    }

    if (value !== oldValue) {
      handleStoreMutationOperation({
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
      handleStoreMutationOperation({
        target,
        key,
        type: 'delete',
      });
    }
    return result;
  },
};
