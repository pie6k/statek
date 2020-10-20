import { useCallback, useEffect, useRef, useState } from 'react';
import { reactWatch } from './scheduler';
import { useMethod } from './utils/useMethod';

export function useWatch(
  callback: () => void,
  forceWatchAgainDeps: any[] = [],
) {
  const callbackRef = useMethod(callback);
  useEffect(() => {
    const clear = reactWatch(() => {
      callbackRef();
    });

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
