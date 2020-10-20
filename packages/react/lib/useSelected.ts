import { useCallback, useRef, useState } from 'react';
import { useWatch } from './useWatch';
import {
  DebounceOrThrottleConfig,
  useMaybeDebouncedOrThrottled,
} from './utils/delayedCallback';

interface UseSelectedConfig extends DebounceOrThrottleConfig {}

export function useSelected<T>(getter: () => T, config?: UseSelectedConfig): T {
  const [value, setValue] = useState(getter);

  const effectCallback = useCallback(() => {
    const newValue = getter();
    setValue(newValue);
  }, [getter]);

  const updateValueCallback = useMaybeDebouncedOrThrottled(
    effectCallback,
    config,
  );

  useWatch(updateValueCallback, [updateValueCallback]);

  return value;
}
