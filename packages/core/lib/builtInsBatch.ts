import { batch } from './batch';
import { globalObj, typedOwnPropertyNames } from './utils';

// this creates and returns a batched version of the passed function
// the cache is necessary to always map the same thing to the same function
// which makes sure that addEventListener/removeEventListener pairs don't break
const batchifiedFunctionsCache = new WeakMap<Function, Function>();
function batchifyFunction(inputFunction: any) {
  if (typeof inputFunction !== 'function') {
    return inputFunction;
  }

  const cachedBatchified = batchifiedFunctionsCache.get(inputFunction);

  if (cachedBatchified) {
    return cachedBatchified;
  }

  const newBatchified = new Proxy(inputFunction, {
    apply(target, thisArg, args) {
      return batch(target, thisArg, args);
    },
  });

  batchifiedFunctionsCache.set(inputFunction, newBatchified);

  return newBatchified;
}

function batchifyMathodArguments<T>(obj: T, methodName: keyof T) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, methodName);
  if (descriptor?.writable && typeof descriptor.value === 'function') {
    obj[methodName] = new Proxy(descriptor.value, {
      apply(target, thisArg, argsArr) {
        return Reflect.apply(target, thisArg, argsArr.map(batchifyFunction));
      },
    });
  }
}

// batched obj.addEventListener(cb) like callbacks
function batchifyMethodsArguments<T>(obj: T, methods: Array<keyof T>) {
  methods.forEach(methodName => batchifyMathodArguments(obj, methodName));
}

function batchifyMethod<T>(obj: T, methodName: keyof T) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, methodName);

  if (!descriptor) {
    return;
  }

  const { value, writable, set, configurable } = descriptor;

  if (configurable && typeof set === 'function') {
    Object.defineProperty(obj, methodName, {
      ...descriptor,
      set: batchifyFunction(set),
    });
  } else if (writable && typeof value === 'function') {
    obj[methodName] = batchifyFunction(value);
  }
}

// batches obj.onevent = fn like calls and store methods
export function batchifyMethods<T>(obj: T, methods?: Array<keyof T>) {
  methods = methods || typedOwnPropertyNames(obj);
  methods.forEach(methodNames => batchifyMethod(obj, methodNames));
  return obj;
}

export function batchifyBuiltins() {
  batchifyMethodsArguments(globalObj, [
    'setTimeout',
    'setInterval',
    'requestAnimationFrame',
    // @ts-ignore
    'requestIdleCallback',
  ]);

  if (globalObj.Promise) {
    batchifyMethodsArguments(Promise.prototype, ['then', 'catch']);
  }
}
