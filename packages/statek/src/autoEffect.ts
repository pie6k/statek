import { observe, Reaction, unobserve } from './observable';
import { scheduler } from './scheduler';

interface Options {
  syncScheduler?: boolean;
}

export function autoEffect(
  fn: () => void,
  options?: Options,
): [clear: () => void, run: () => void] {
  const reaction: Reaction<[], void> = observe<[], void>(
    fn,
    {
      scheduler: () => {
        if (options?.syncScheduler) {
          reaction();
          return;
        }
        scheduler.add(reaction);
      },
    },
    [],
  );

  function clear() {
    unobserve(reaction);
  }

  return [clear, reaction];
}
