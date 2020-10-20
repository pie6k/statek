import { createChildStoreIfNeeded, storeToRawMap } from '../store';
import {
  handleStoreMutationOperation,
  handleStoreReadOperation,
  MutationOperationInfo,
  ReadOperationInfo,
} from '../operations';
import { isSymbol, typedOwnPropertyNames } from '../utils';

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
    if (process.env.NODE_ENV !== 'production' && key === 'toJSON') {
      console.warn(
        `You're calling JSON.stringify on the store. This will read every single, nested field of the store in reactive mode which can have performance impact. Consider calling \`JSON.stringify(dontWatch(() => store))\` instead.`,
      );
    }
    const result = Reflect.get(target, key, receiver);

    // do not register (observable.prop -> reaction) pairs for well known symbols
    // these symbols are frequently retrieved in low level JavaScript under the hood
    if (typeof key === 'symbol' && wellKnownSymbols.has(key)) {
      return result;
    }

    // register and save (observable.prop -> runningReaction)
    handleStoreReadOperation({
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

    return createChildStoreIfNeeded(result, target);
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

    if (!hadKey) {
      const operation: MutationOperationInfo = {
        target,
        key,
        value,
        type: 'add',
      };

      // execute the set operation before running any reaction
      const result = Reflect.set(target, key, value, receiver);
      handleStoreMutationOperation(operation);
      return result;
    }

    // save if the value changed because of this set operation
    const oldValue = (target as any)[key];

    if (value === oldValue) {
      return true;
    }

    const operation: MutationOperationInfo = {
      target,
      key,
      value,
      type: 'set',
    };

    // execute the set operation before running any reaction
    const result = Reflect.set(target, key, value, receiver);
    // do not queue reactions if the target of the operation is not the raw receiver
    // (possible because of prototypal inheritance)
    if (target !== storeToRawMap.get(receiver)) {
      return result;
    }

    handleStoreMutationOperation(operation);

    return result;
  },

  deleteProperty(target, key) {
    // save if the object had the key
    const hadKey = hasOwnProperty.call(target, key);

    const operation: MutationOperationInfo = {
      target,
      key,
      type: 'delete',
    };

    // execute the delete operation before running any reaction
    const result = Reflect.deleteProperty(target, key);
    // only queue reactions for delete operations which resulted in an actual change
    if (hadKey) {
      handleStoreMutationOperation(operation);
    }
    return result;
  },
};
