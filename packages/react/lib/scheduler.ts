import { createAsyncScheduler, watch, ReactionCallback } from '@statek/core';
import { unstable_batchedUpdates } from 'react-dom';
import { act } from 'react-test-renderer';

export const reactScheduler = createAsyncScheduler(task => {
  act(() => {
    unstable_batchedUpdates(task);
  });
});

export function reactWatch(callback: ReactionCallback) {
  return watch(callback, { scheduler: reactScheduler });
}
