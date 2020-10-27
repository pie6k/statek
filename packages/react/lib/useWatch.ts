import { useEffect } from 'react';
import { allowNestedWatch } from 'statek';
import { reactWatch } from './scheduler';
import { useMethod } from './utils/useMethod';

export function useWatch(
  callback: () => void,
  forceWatchAgainDeps: any[] = [],
) {
  const callbackRef = useMethod(callback);
  useEffect(() => {
    const clear = allowNestedWatch(() =>
      reactWatch(() => {
        callbackRef();
      }),
    );

    return () => {
      clear();
    };
  }, forceWatchAgainDeps);
}

export function useStatefulWatch(
  factory: () => () => void,
  forceWatchAgainDeps: any[],
) {
  useEffect(() => {
    const effectCallback = factory();
    const clearEffect = reactWatch(() => {
      effectCallback();
    });

    return () => {
      clearEffect();
    };
  }, [forceWatchAgainDeps]);
}
