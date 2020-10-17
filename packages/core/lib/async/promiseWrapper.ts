import { allowInternal } from '../internal';
import { ReactionCallback } from '../reaction';
import { getRunningReaction, injectReaction } from '../reactionsStack';

const _originalThen = Promise.prototype.then;

export const asyncReactions = new WeakSet<ReactionCallback>();

const asyncReactionPendingPhase = new WeakMap<ReactionCallback, PendingPhase>();

export function assertNoPendingPhaseRunning(
  reaction: ReactionCallback,
  msg?: string,
) {
  const phase = asyncReactionPendingPhase.get(reaction);

  if (!phase) {
    return;
  }

  if (phase.isCancelled) {
    return;
  }

  throw new Error(msg ?? 'Async reaction has pending phase already');
}

export function cancelPendingPhaseIfNeeded(
  reaction: ReactionCallback,
  msg?: string,
) {
  const phase = asyncReactionPendingPhase.get(reaction);

  if (!phase) {
    return;
  }

  phase.cancel();

  asyncReactionPendingPhase.delete(reaction);
}

export function assertNoPendingPhaseAfterReactionFinished(
  reaction: ReactionCallback,
) {
  assertNoPendingPhaseRunning(
    reaction,
    'Async reaction has pending phase after it finished',
  );
}

export function isAsyncReaction(reaction: ReactionCallback) {
  return asyncReactions.has(reaction);
}

interface PendingPhase {
  cancel: () => void;
  isCancelled: boolean;
  error?: {
    value: any;
  };
  errorListeners: Set<(error: any) => void>;
}

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
  const runningReaction = getRunningReaction()!;

  // If then is called outside of reaction - use original then.
  if (!runningReaction) {
    return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
  }

  // Mark reaction as async.
  asyncReactions.add(runningReaction);

  const phase: PendingPhase = {
    cancel() {
      phase.isCancelled = true;
    },
    isCancelled: false,
    errorListeners: new Set(),
  };

  assertNoPendingPhaseRunning(runningReaction);

  asyncReactionPendingPhase.set(runningReaction, phase);

  /**
   * Now we're wrapping onFulfilled callback with the one that will inject reaction that is running now in the moment when this promise will resolve.
   */
  const wrappedOnFulfilled = (result: any) => {
    // If this phase was cancelled before it resolved.
    if (phase.isCancelled) {
      const error = new AsyncReactionCancelledError(
        'Async reaction called as some of its dependencies changed before it finished.',
      );

      if (onRejected) {
        Reflect.apply(onRejected, this, [error]);
      }

      return;

      // return Promise.reject(error);
    }

    // Double check if phase was not changed without canelling this one. This could lead to nasty bugs and should never happen.
    const phaseNow = asyncReactionPendingPhase.get(runningReaction!);

    if (!phaseNow || phaseNow !== phase) {
      throw new Error(
        'Incorrect internal phase state - running phase is not cancelled, but pending phase has changed.',
      );
    }

    // Phase is finished. Let's remove it just before calling actual resolve function.
    asyncReactionPendingPhase.delete(runningReaction);

    // Now let's re-inject parent reaction, so it'll be active one while fullfill callback is running
    let isFullfilRunning = true;
    const removeInjectedReaction = allowInternal(() =>
      injectReaction({
        reaction: runningReaction!,
        // Mark it as 'alive' only during lifetime of this callback.
        getIsStillRunning() {
          return isFullfilRunning;
        },
      }),
    );

    // Call actual callback and get it's result.
    // Mark injected reaction as not active anymore and return original result.
    try {
      const fulfillResult = Reflect.apply(onFulfilled, this, [result]);
      return fulfillResult;
    } catch (error) {
      return Promise.reject(error);
    } finally {
      // Instantly after callback has finished - remove injected reaction

      isFullfilRunning = false;
      removeInjectedReaction();
    }
  };

  // Call .then with wrapped callback instead of original one.
  const result = Reflect.apply(_originalThen, this, [
    wrappedOnFulfilled,
    onRejected,
  ]);

  return result;
}

let didInject = false;

export function injectReactivePromiseThen() {
  if (didInject) {
    return;
  }

  didInject = true;

  Promise.prototype.then = then;
  Promise.prototype.catch;
}

export class AsyncReactionCancelledError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'AsyncReactionCancelledError';
  }
  foo = true;
}

export function isAsyncReactionCancelledError(
  input: any,
): input is AsyncReactionCancelledError {
  return input && input.name === 'AsyncReactionCancelledError';
}
