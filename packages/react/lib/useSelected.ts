import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dontWatch, manualWatch } from 'statek/lib';
import { reactScheduler } from './scheduler';
import { useWatch } from './useWatch';
import {
  DebounceOrThrottleConfig,
  useMaybeDebouncedOrThrottled,
} from './utils/delayedCallback';
import { useForceUpdate } from './utils/useForceUpdate';
import { useMethod } from './utils/useMethod';

interface UseSelectedConfig extends DebounceOrThrottleConfig {}

export function useSelected<T>(getter: () => T, config?: UseSelectedConfig): T {
  const getterRef = useMethod(getter);
  const forceUpdate = useForceUpdate();

  const maybeDelayedForceUpdate = useMaybeDebouncedOrThrottled(
    forceUpdate,
    config,
  );
  const watchedGetter = useMemo(() => {
    return manualWatch(getterRef, maybeDelayedForceUpdate, {
      scheduler: reactScheduler,
    });
  }, []);

  const result = watchedGetter();

  useEffect(() => {
    return () => {
      watchedGetter.stop();
    };
  }, [watchedGetter]);

  return result;
}

export function useInitialSelected<T>(getter: () => T): T {
  const [value] = useState(() => {
    return dontWatch(() => {
      return getter();
    });
  });

  return value;
}
