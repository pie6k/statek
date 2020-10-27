import { getRunningReaction } from '../reactionsStack';
import { addReactionPendingPromise } from '../suspense';
import { createStackCallback, noop } from '../utils';
import type { Selector } from './types';

export const [warming, warmingManager] = createStackCallback(noop);

export async function warmSelectors(...selectors: Selector<any>[]) {
  const runningReaction = getRunningReaction();

  const promises: Promise<any>[] = [];

  warming(() => {
    selectors.forEach(selector => {
      try {
        // request selector value.
        selector.value;
        // if it's
      } catch (errorOrPromise) {
        // Selectors might suspend during warming, but we still want to warm all of them.
        // We're however adding all pending promises to this reaction to be able to wait for them all before
        // re-running if it will be set this way in reaction settings
        if (errorOrPromise instanceof Promise) {
          promises.push(errorOrPromise);
        }

        // We're also not throwing their errors as they would be thrown anyway as soon as value of some
        // rejected selector is read.
      }
    });
  });

  if (runningReaction) {
    promises.forEach(promise => {
      addReactionPendingPromise(runningReaction, promise);
    });
  }

  try {
    await warming(() => {
      return Promise.all(promises);
    });
  } catch (error) {}
}
