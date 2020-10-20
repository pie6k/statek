import { unstable_batchedUpdates } from 'react-dom';
import { createAsyncScheduler, ReactionCallback, watch } from 'statek';

export const reactScheduler = createAsyncScheduler(task => {
  unstable_batchedUpdates(() => {
    task();
  });
});

export function reactWatch(callback: ReactionCallback) {
  return watch(callback, { scheduler: reactScheduler });
}
