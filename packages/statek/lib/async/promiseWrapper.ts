import { allowInternal } from '../internal';
import { isReactionErased, ReactionCallback } from '../reaction';
import { getRunningReaction, injectReaction } from '../reactionsStack';
import { warmingManager } from '../selector/warming';
import { isReactionSuspended } from '../suspense';

export const asyncReactions = new WeakMap<
  ReactionCallback,
  AsyncReactionData
>();

interface AsyncReactionData {
  pendingPhases: Set<PendingPhase>;
}

function getAsyncReactionData(reaction: ReactionCallback) {
  if (!asyncReactions.has(reaction)) {
    throw new Error('Provided reaction is not async reaction');
  }

  return asyncReactions.get(reaction)!;
}

export function markReactionAsAsync(reaction: ReactionCallback) {
  const existingData = asyncReactions.get(reaction);

  if (existingData) {
    return existingData;
  }

  const asyncData: AsyncReactionData = {
    pendingPhases: new Set(),
  };

  asyncReactions.set(reaction, asyncData);

  return asyncData;
}

function hasReactionPendingPhase(
  reaction: ReactionCallback,
  phase: PendingPhase,
) {
  return getAsyncReactionData(reaction).pendingPhases.has(phase);
}

export function assertNoPendingPhaseRunning(
  reaction: ReactionCallback,
  msg?: string,
) {
  const phases = getAsyncReactionData(reaction).pendingPhases;

  for (const phase of phases) {
    // If there is some phase, but it is cancelled - it will not call any changes anyway.
    if (phase.isCancelled) {
      continue;
    }

    throw new Error(msg ?? 'Async reaction has pending phase already');
  }
}

export function cancelPendingPhasesIfNeeded(reaction: ReactionCallback) {
  const phases = getAsyncReactionData(reaction).pendingPhases;

  phases.forEach(phase => {
    phase.cancel();
  });
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
}

const _originalThen = Promise.prototype.then;

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
  const callerReaction = getRunningReaction()!;

  // If then is called outside of reaction - use original then.
  if (!callerReaction) {
    return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
  }

  // Warming reactions responses are not used, so continue normally
  if (warmingManager.isRunning()) {
    return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
  }

  const asyncData = markReactionAsAsync(callerReaction);

  const phase: PendingPhase = {
    cancel() {
      phase.isCancelled = true;
    },
    isCancelled: false,
  };

  asyncData.pendingPhases.add(phase);

  /**
   * Now we're wrapping onFulfilled callback with the one that will inject reaction that is running now in the moment when this promise will resolve.
   */
  const wrappedOnFulfilled = (result: any) => {
    if (isReactionErased(callerReaction)) {
      const error = new AsyncReactionCancelledError(
        'Async reaction was stopped while it was resolving.',
      );

      if (onRejected) {
        Reflect.apply(onRejected, this, [error]);
        return;
      }

      return Promise.reject(error);
    }
    // If this phase was cancelled before it resolved.
    if (phase.isCancelled) {
      const error = new AsyncReactionCancelledError(
        'Async reaction is cancelled as some of its dependencies changed while it was still running.',
      );

      if (onRejected) {
        Reflect.apply(onRejected, this, [error]);
        return;
      }

      return Promise.reject(error);
    }

    // Double check if phase was not changed without canelling this one. This could lead to nasty bugs and should never happen.
    if (!hasReactionPendingPhase(callerReaction, phase)) {
      throw new Error(
        'Incorrect internal phase state - running phase is not cancelled, but pending phase has changed.',
      );
    }

    // Phase is finished. Let's remove it just before calling actual resolve function.
    // This is in case callback would create another promise etc. Such promise will expect that no pending phase is running.
    asyncData.pendingPhases.delete(phase);

    // Now let's re-inject parent reaction, so it'll be active one while fullfill callback is running
    let isResolveCallbackRunning = true;
    const removeInjectedReaction = allowInternal(() =>
      injectReaction({
        reaction: callerReaction,
        // Mark it as 'alive' only during lifetime of this callback.
        getIsStillRunning() {
          return isResolveCallbackRunning;
        },
      }),
    );

    // Call actual callback and get it's result.
    // Mark injected reaction as not active anymore and return original result.
    try {
      return Reflect.apply(onFulfilled, this, [result]);
    } catch (error) {
      if (onRejected) {
        Reflect.apply(onRejected, this, [error]);
      }
      return Promise.reject<any>(error);
    } finally {
      // Instantly after callback has finished - remove injected reaction
      isResolveCallbackRunning = false;
      removeInjectedReaction();
    }
  };

  // Call .then with wrapped callback instead of original one.
  return Reflect.apply(_originalThen, this, [wrappedOnFulfilled, onRejected]);
}

let didInject = false;

export function injectReactivePromiseThen() {
  if (didInject) {
    return;
  }

  didInject = true;

  Promise.prototype.then = then;
}

export class AsyncReactionCancelledError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'AsyncReactionCancelledError';
  }
}

export function isAsyncReactionCancelledError(
  input: any,
): input is AsyncReactionCancelledError {
  return input && input.name === 'AsyncReactionCancelledError';
}
