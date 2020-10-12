import { ReactionScheduler } from './batch';
import { applyReaction, ReactionCallback } from './reaction';

type Timeout = ReturnType<typeof setTimeout>;

type Task = () => void;

/**
 * @internal
 */
export async function waitForSchedulersToFlush() {
  await Promise.all(Array.from(flushPromises));
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

    reactions.forEach(reaction => {
      applyReaction(reaction);
    });
  }

  async function enqueue() {
    if (timeout) {
      await flushPromise;
      return;
    }

    flushPromise = new Promise<void>(resolve => {
      timeout = setTimeout(async () => {
        timeout = null;

        if (!wrapper) {
          run();
          resolve();
          return;
        }

        await wrapper(run);
        flushPromises.delete(flushPromise!);
        flushPromise = null;
        resolve();
      }, 0);
    });

    flushPromises.add(flushPromise);
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

let defaultScheduler = syncScheduler;

export function getDefaultScheduler() {
  return defaultScheduler;
}

export function setDefaultScheduler(scheduler: ReactionScheduler) {
  defaultScheduler = scheduler;
}
