import { useCallback, useEffect, useRef, useState } from 'react';
import { autoEffect } from './autoEffect';
import { useMethod } from './useMethod';

export function useStoreSelector<T>(getter: () => T): T {
  const [value, setValue] = useState(getter);

  const effectCallback = useCallback(() => {
    const newValue = getter();
    setValue(newValue);
  }, [getter]);

  useStoreEffect(effectCallback, [getter]);

  return value;
}

export function useStoreEffect(callback: () => void, deps: any[] = []) {
  const callbackRef = useMethod(callback);
  useEffect(() => {
    const [clear] = autoEffect(
      () => {
        callbackRef();
      },
      // { syncScheduler: true },
    );

    return () => {
      clear();
    };
  }, deps);
}

export function useStatefulStoreEffect(factory: () => () => void, deps: any[]) {
  useEffect(() => {
    const effectCallback = factory();
    const [clearEffect] = autoEffect(() => {
      effectCallback();
    });

    return () => {
      clearEffect();
    };
  }, [deps]);
}

type DebounceTime<T> = number | ((value: T) => number);

function resolveDebounceTime<T>(debounceTime: DebounceTime<T>, value: T) {
  if (typeof debounceTime === 'number') {
    return debounceTime;
  }

  return debounceTime(value);
}

export function useDebouncedStoreSelector<T>(
  getter: () => T,
  time: DebounceTime<T>,
): T {
  const [value, setValue] = useDebouncedState<T>(getter, time);

  const effectCallback = useCallback(() => {
    const newValue = getter();
    setValue(newValue);
  }, [getter]);

  useStoreEffect(effectCallback, [getter]);

  return value;
}

type TimeoutType = ReturnType<typeof setTimeout>;

function useDebouncedState<T>(
  value: T | (() => T),
  time: number | ((value: T) => number),
) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  const setValueTimeoutRef = useRef<null | TimeoutType>();

  const setWithTimeout = useCallback(
    (value: T) => {
      clearTimeout(setValueTimeoutRef.current!);

      const debounceTime = resolveDebounceTime(time, value);

      if (debounceTime === 0) {
        setDebouncedValue(value);
        return;
      }

      setValueTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
      }, debounceTime);
    },
    [time],
  );

  return [debouncedValue, setWithTimeout] as const;
}
