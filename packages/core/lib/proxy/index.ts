import { mapLikeProxyHandlers } from './collection';
import { basicProxyHandlers } from './basic';

const globalObj =
  typeof window === 'object' ? window : (Function('return this')() as Window);

// built-in object can not be wrapped by Proxies
// their methods expect the object instance as the 'this' instead of the Proxy wrapper
// complex objects are wrapped with a Proxy of instrumented methods
// which switch the proxy to the raw object and to add reactive wiring
const supportedBuiltInTypes = new Map<object, ProxyHandler<any>>([
  [Map, mapLikeProxyHandlers],
  [Set, mapLikeProxyHandlers],
  [WeakMap, mapLikeProxyHandlers],
  [WeakSet, mapLikeProxyHandlers],
  // basic
  [Object, basicProxyHandlers],
  [Array, basicProxyHandlers],
  [Int8Array, basicProxyHandlers],
  [Uint8Array, basicProxyHandlers],
  [Uint8ClampedArray, basicProxyHandlers],
  [Int16Array, basicProxyHandlers],
  [Uint16Array, basicProxyHandlers],
  [Int32Array, basicProxyHandlers],
  [Uint32Array, basicProxyHandlers],
  [Float32Array, basicProxyHandlers],
  [Float64Array, basicProxyHandlers],
]);

export function canWrapInProxy(input: object) {
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
    globalObj[constructor.name as any] === (constructor as any);

  return !isBuiltIn;
}

export function wrapObjectInProxy<T extends object>(input: T): T {
  if (!canWrapInProxy(input)) {
    return input;
  }

  return new Proxy(
    input,
    supportedBuiltInTypes.get(input.constructor) ?? basicProxyHandlers,
  );
}
