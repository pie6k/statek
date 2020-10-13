import { watchSelected } from '@statek/core';
import { useEffect, useMemo, useRef } from 'react';
import { reactScheduler } from './scheduler';
import { useForceUpdate } from './useForceUpdate';

function noop() {}

export function useWatchSelected<T extends object>(storeGetter: () => T) {
  const forceUpdate = useForceUpdate();

  const stopRef = useRef<() => void>(noop);

  useMemo(() => {
    stopRef.current?.();
    // We cannot create same reaction twice, so let's wrap force update in fresh function.
    function forceUpdateCallback() {
      forceUpdate();
    }
    stopRef.current = watchSelected(storeGetter, forceUpdateCallback, {
      scheduler: reactScheduler,
    });
  }, [storeGetter]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);
}
