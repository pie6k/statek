import { createAsyncScheduler, watch, ReactionCallback } from '@statek/core';
import { unstable_batchedUpdates } from 'react-dom';

export const reactScheduler = createAsyncScheduler(task => {
  unstable_batchedUpdates(() => {
    task();
  });
});

export function reactWatch(callback: ReactionCallback) {
  return watch(callback, { scheduler: reactScheduler });
}
