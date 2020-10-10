import { collectionProxyHandlers } from './collections';

const globalObj =
  typeof window === 'object' ? window : (Function('return this')() as Window);

// built-in object can not be wrapped by Proxies
// their methods expect the object instance as the 'this' instead of the Proxy wrapper
// complex objects are wrapped with a Proxy of instrumented methods
// which switch the proxy to the raw object and to add reactive wiring
const supportedBuiltInTypes = new Map<object, any>([
  [Map, collectionProxyHandlers],
  [Set, collectionProxyHandlers],
  [WeakMap, collectionProxyHandlers],
  [WeakSet, collectionProxyHandlers],
  [Object, null],
  [Array, null],
  [Int8Array, null],
  [Uint8Array, null],
  [Uint8ClampedArray, null],
  [Int16Array, null],
  [Uint16Array, null],
  [Int32Array, null],
  [Uint32Array, null],
  [Float32Array, null],
  [Float64Array, null],
]);

export function canWrapInProxy(input: { constructor: any }) {
  if (!input) {
    return false;
  }

  const { constructor } = input;

  if (supportedBuiltInTypes.has(constructor)) {
    return true;
  }

  const isBuiltIn =
    typeof constructor === 'function' &&
    constructor.name in globalObj &&
    globalObj[constructor.name] === constructor;

  return !isBuiltIn;
}

export function getBuiltInTypeProxyHandlers(obj: any) {
  return supportedBuiltInTypes.get(obj.constructor);
}
