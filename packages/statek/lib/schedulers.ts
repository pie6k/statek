import { builtinModules } from 'module';
import { isAsyncReactionCancelledError } from './async/promiseWrapper';
import { batch, ReactionScheduler } from './batch';
import { warnIfUsingInternal } from './internal';
import { applyReaction, ReactionCallback } from './reaction';

type Timeout = ReturnType<typeof setTimeout>;

type Task = () => void;

/**
 * @internal
 */
export async function waitForSchedulersToFlush() {
  if (process.env.NODE_ENV !== 'production') {
    warnIfUsingInternal('waitForSchedulersToFlush');
  }

  const flushOrFailPromises = Array.from(flushPromises).map(flushPromise => {
    return new Promise<void>(async resolve => {
      try {
        await flushPromise;
        resolve();
      } catch (error) {
        console.log('error', error);
        resolve();
        return;
      }
    });
  });

  await Promise.all(flushOrFailPromises);
}

const flushPromises = new Set<Promise<void>>();

export function createAsyncScheduler(
  wrapper?: (task: Task) => Promise<void> | void,
) {
  const pendingReactions = new Set<ReactionCallback>();
  let timeout: Timeout | null = null;
  let flushPromise: Promise<void> | null = null;

  function run() {
    const reactions = Array.from(pendingReactions);
    pendingReactions.clear();

    batch(() => {
      reactions.forEach(reaction => {
        applyReaction(reaction);
      });
    });
  }

  // TODO write test for enqueue that got cancelled

  async function enqueueWithCancelHandle() {
    // TODO write test for scheduler that is cancalled
    if (timeout) {
      try {
        await flushPromise;
      } catch (error) {
        if (isAsyncReactionCancelledError(error)) {
          // Scheduled reaction got cancelled as it's dependencies changed while scheduler was waiting.
        } else {
          throw error;
        }
      }
      return;
    }

    flushPromise = new Promise<void>((resolve, reject) => {
      timeout = setTimeout(async () => {
        timeout = null;

        if (!wrapper) {
          run();
          resolve();
          return;
        }

        try {
          await wrapper(run);
        } catch (error) {
          reject(error);
        } finally {
          flushPromises.delete(flushPromise!);
          flushPromise = null;
          resolve();
        }
      }, 0);
    });

    flushPromises.add(flushPromise);
  }

  function enqueue() {
    return enqueueWithCancelHandle();
  }

  return async function add(reaction: ReactionCallback) {
    pendingReactions.add(reaction);
    return enqueue();
  };
}

export const asyncScheduler: ReactionScheduler = createAsyncScheduler();

export const syncScheduler: ReactionScheduler = reaction => {
  applyReaction(reaction);
};

let defaultScheduler =
  process.env.NODE_ENV === 'test' ? syncScheduler : asyncScheduler;

export function getDefaultScheduler() {
  return defaultScheduler;
}

export function setDefaultScheduler(scheduler: ReactionScheduler) {
  defaultScheduler = scheduler;
}

const builtInSchedulers = {
  sync: syncScheduler,
  async: asyncScheduler,
};

export type BuiltInScheduler = keyof typeof builtInSchedulers;

export type SchedulerInput = BuiltInScheduler | ReactionScheduler;

export function resolveSchedulerInput(
  input?: SchedulerInput,
): ReactionScheduler {
  if (!input) {
    return getDefaultScheduler();
  }

  if (typeof input === 'string') {
    if (!builtInSchedulers[input]) {
      throw new Error(`Incorrect scheduler name - ${input}`);
    }
    return builtInSchedulers[input];
  }

  return input;
}
