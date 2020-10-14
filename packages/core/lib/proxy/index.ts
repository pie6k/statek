import { mapLikeProxyHandlers } from './collection';
import { basicProxyHandlers } from './basic';
import { arrayProxyHandlers } from './array';

const globalObj =
  typeof window === 'object' ? window : (Function('return this')() as Window);

// built-in object can not be wrapped by Proxies
// their methods expect the object instance as the 'this' instead of the Proxy wrapper
// complex objects are wrapped with a Proxy of instrumented methods
// which switch the proxy to the raw object and to add reactive wiring
export const builtInProxyHandlers = new Map<object, ProxyHandler<any>>([
  [Map, mapLikeProxyHandlers],
  [Set, mapLikeProxyHandlers],
  [WeakMap, mapLikeProxyHandlers],
  [WeakSet, mapLikeProxyHandlers],
  // basic
  [Object, basicProxyHandlers],
  [Array, arrayProxyHandlers],
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

export function canWrapInProxy(input: object): string | true {
  if (isPrimitive(input)) {
    return 'Non object value';
  }

  if (typeof input === 'function') {
    return 'Non object value';
  }

  const { constructor } = input;

  if (builtInProxyHandlers.has(constructor)) {
    return true;
  }

  const isBuiltIn =
    typeof constructor === 'function' &&
    constructor.name in globalObj &&
    globalObj[constructor.name as any] === (constructor as any);

  if (isBuiltIn) {
    return 'Built in object or accessable in global / window';
  }

  return true;
}

export function wrapObjectInProxy<T extends object>(input: T): T {
  if (!canWrapInProxy(input)) {
    return input;
  }

  return new Proxy<any>(
    input,
    builtInProxyHandlers.get(input.constructor) ?? basicProxyHandlers,
  );
}

function isPrimitive(input: any) {
  return input !== Object(input);
}
