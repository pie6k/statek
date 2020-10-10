/* eslint camelcase: 0 */

// react-platform is set to either react-dom or react-native during test and execution
// eslint-disable-next-line import/no-unresolved
import { unstable_batchedUpdates } from 'react-dom';
import { globalObj } from './utils';
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
const cache = new WeakMap();
function batchFn(fn: (args: any) => void) {
  if (typeof fn !== 'function') {
    return fn;
  }
  let batched = cache.get(fn);
  if (!batched) {
    batched = new Proxy(fn, {
      apply(target, thisArg, args) {
        return batch(target, thisArg, args);
      },
    });
    cache.set(fn, batched);
  }
  return batched;
}

function batchMethodCallbacks(obj: any, method: any) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, method);
  if (
    descriptor &&
    descriptor.writable &&
    typeof descriptor.value === 'function'
  ) {
    obj[method] = new Proxy(descriptor.value, {
      apply(target, ctx, args) {
        return Reflect.apply(target, ctx, args.map(batchFn));
      },
    });
  }
}

// batched obj.addEventListener(cb) like callbacks
function batchMethodsCallbacks(obj: any, methods: any) {
  methods.forEach((method: any) => batchMethodCallbacks(obj, method));
}

function batchMethod(obj: any, method: any) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, method);
  if (!descriptor) {
    return;
  }
  const { value, writable, set, configurable } = descriptor;

  if (configurable && typeof set === 'function') {
    Object.defineProperty(obj, method, {
      ...descriptor,
      set: batchFn(set),
    });
  } else if (writable && typeof value === 'function') {
    obj[method] = batchFn(value);
  }
}

// batches obj.onevent = fn like calls and store methods
export function batchMethods(obj: any, methods?: any) {
  methods = methods || Object.getOwnPropertyNames(obj);
  methods.forEach((method: any) => batchMethod(obj, method));
  return obj;
}

///////////////

// batched obj.addEventListener(cb) like callbacks

// do a sync batching for the most common task sources
// this should be removed when React's own batching is improved in the future

// batch timer functions
batchMethodsCallbacks(globalObj, [
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'requestIdleCallback',
]);

if (globalObj.Promise) {
  batchMethodsCallbacks(Promise.prototype, ['then', 'catch']);
}

// HTTP event handlers are usually wrapped by Promises, which is covered above
