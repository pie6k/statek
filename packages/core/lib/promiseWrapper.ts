import { allowInternal } from './internal';
import { getRunningReaction, injectReaction } from './reactionsStack';

const _originalThen = Promise.prototype.then;

let didInject = false;

/**
 * This is modified version of then that will be injected into Promise prototype.
 *
 * The goal is to make it as transparent as possible and only be fired when needed.
 *
 * What it does is than when calling 'then' - it will check if '.then' was called during some reaction.
 *
 * If so - it will remember this reaction and inject the same reaction during running of then callback.
 *
 * This way reactions are able to be async without loosing their context.
 */
function then(this: any, onFulfilled?: any, onRejected?: any): any {
  // If this has no fulfilled callback - no point of wrapping.
  if (!onFulfilled) {
    return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
  }

  // Try to get running reaction.
  const runningReaction = getRunningReaction();

  // If then is called outside of reaction - use original then.
  if (!runningReaction) {
    return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
  }

  /**
   * Now we're wrapping onFulfilled callback with the one that will inject reaction that is running now in the moment when this promise will resolve.
   */

  function wrappedOnFulfilled(this: any, result: any) {
    // Promise has just resolved!
    // Instantly inject 'parent' reaction of this promise, before calling actual callback.
    let isFullfilRunning = true;
    allowInternal(() => {
      injectReaction({
        reaction: runningReaction!,
        // Mark it as 'alive' only during lifetime of this callback.
        getIsStillRunning() {
          return isFullfilRunning;
        },
      });
    });

    // Call actual callback and get it's result.
    const fulfillResult = Reflect.apply(onFulfilled, this, [result]);

    // Mark injected reaction as not active anymore and return original result.
    isFullfilRunning = false;
    return fulfillResult;
  }

  // Call .then with wrapped callback instead of original one.
  const result = Reflect.apply(_originalThen, this, [
    wrappedOnFulfilled,
    onRejected,
  ]);

  return result;
}

export function injectReactivePromiseThen() {
  didInject = true;

  Promise.prototype.then = then;
}
