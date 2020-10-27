import { useCallback, useEffect, useRef, useState } from 'react';
import { manualWatch } from 'statek/lib';
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
  const [watchedGetter] = useState(() => {
    return manualWatch(getterRef, maybeDelayedForceUpdate, {
      scheduler: reactScheduler,
    });
  });

  const result = watchedGetter();

  useEffect(() => {
    return () => {
      watchedGetter.stop();
    };
  }, []);

  return result;
}
