// react-platform is set to either react-dom or react-native during test and execution
import { unstable_batchedUpdates } from 'react-dom';
import { globalObj, typedOwnPropertyNames } from './utils';
import { scheduler } from './scheduler';

// this runs the passed function and delays all re-renders
// until the function is finished running
// react renders are batched by unstable_batchedUpdates
// autoEffects and other custom reactions are batched by our scheduler
export function batch(fn: (args: any) => void, ctx?: any, args?: any) {
  // do not apply scheduler logic if it is already applied from a parent function
  // it would flush in the middle of the parent's batch
  if (scheduler.isOn) {
    return unstable_batchedUpdates(() => fn.apply(ctx, args));
  }
  try {
    scheduler.on();
    return unstable_batchedUpdates(() => fn.apply(ctx, args));
  } finally {
    scheduler.flush();
    scheduler.off();
  }
}

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
  if (descriptor.writable && typeof descriptor.value === 'function') {
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

///////////////

// batched obj.addEventListener(cb) like callbacks

// do a sync batching for the most common task sources
// this should be removed when React's own batching is improved in the future

// batch timer functions
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

// HTTP event handlers are usually wrapped by Promises, which is covered above
