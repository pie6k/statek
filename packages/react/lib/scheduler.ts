import { unstable_batchedUpdates } from 'react-dom';
import { batch, createAsyncScheduler, ReactionCallback, watch } from 'statek';

export const reactScheduler = createAsyncScheduler(task => {
  unstable_batchedUpdates(() => {
    // console.log('>>>>>>> BATCHED START');
    batch(() => {
      task();
    });

    // console.log('>>>>>>> BATCHED END');
  });
});

export function reactWatch(callback: ReactionCallback) {
  return watch(callback, { scheduler: reactScheduler });
}
