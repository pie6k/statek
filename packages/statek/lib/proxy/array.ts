import { handleStoreReadOperation, ReadOperationInfo } from '../operations';
import { createChildStore } from '../store';
import { createStackCallback, noop } from '../utils';
import { basicProxyHandlers, wellKnownSymbols } from './basic';

// prettier-ignore
const iterationArrayMethodNames: Array<keyof Array<any>> = [
  'forEach', 'map', 'every', 'find', 'some', 'some', 'filter', 'reduce', 'reduceRight', 'findIndex', 'indexOf', 'lastIndexOf',
];

const wrappedArrayIterableMethods = new Map<string, any>();
iterationArrayMethodNames.forEach(callbackName => {
  const originalArrayMethod = Array.prototype[callbackName];

  function wrapped(this: any[], observable: any[], ...args: any[]) {
    const operation: ReadOperationInfo = { target: this, type: 'iterate' };
    handleStoreReadOperation(operation);
    return runInIteration.call(
      observable,
      originalArrayMethod,
      args,
      operation,
    );
  }

  wrappedArrayIterableMethods.set(callbackName as string, wrapped);
});

const [runInIteration, runInIterationManager] = createStackCallback<
  ReadOperationInfo
>(noop);

export const arrayProxyHandlers: ProxyHandler<object> = {
  ...basicProxyHandlers,
  has(target, key) {
    // register and save (observable.prop -> runningReaction)
    !runInIterationManager.getCurrentData() &&
      handleStoreReadOperation({ target, key, type: 'has' });
    return Reflect.has(target, key);
  },
  get(target, key, receiver) {
    if (wrappedArrayIterableMethods.has(key as any)) {
      return wrappedArrayIterableMethods
        .get(key as string)
        .bind(target, receiver);
    }

    const result = Reflect.get(target, key, receiver);

    // do not register (observable.prop -> reaction) pairs for well known symbols
    // these symbols are frequently retrieved in low level JavaScript under the hood
    if (typeof key === 'symbol' && wellKnownSymbols.has(key)) {
      return result;
    }

    if (!runInIterationManager.getCurrentData()) {
      handleStoreReadOperation({
        target,
        key,
        type: key === 'length' ? 'iterate' : 'get',
      });
    }

    // do not violate the none-configurable none-writable prop get handler invariant
    // fall back to none reactive mode in this case, instead of letting the Proxy throw a TypeError
    const descriptor = Reflect.getOwnPropertyDescriptor(target, key);

    if (descriptor?.writable === false && descriptor.configurable === false) {
      return result;
    }

    // if we are inside a reaction and observable.prop is an object wrap it in an observable too
    // this is needed to intercept property access on that object too (dynamic observable tree)
    return createChildStore(result, target);
  },
};
