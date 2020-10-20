import { useMemo } from 'react';

export interface DebounceOrThrottleConfig {
  throttle?: number;
  debounce?: number;
}

export function debounceOrThrottle<Args extends any[]>(
  callback: (...args: Args) => void,
  config: DebounceOrThrottleConfig,
): (...args: Args) => void {
  if (!config.debounce && !config.throttle) {
    throw new Error(`Either debounce or throttle option must be provided`);
  }

  if (config.throttle && config.debounce) {
    throw new Error('Both throttle and debounce cannot be provided');
  }

  if (config.debounce) {
    return debounce(callback, config.debounce);
  }

  return throttle(callback, config.throttle!);
}

export function useMaybeDebouncedOrThrottled<Args extends any[]>(
  callback: (...args: Args) => void,
  config?: DebounceOrThrottleConfig,
) {
  const finalCallback = useMemo(() => {
    if (!config?.throttle && !config?.debounce) {
      return callback;
    }

    return debounceOrThrottle(callback, config);
  }, [callback, config?.debounce, config?.throttle]);

  return finalCallback;
}

/**
 * Type safe debounce method. It'll return function with the same signature as input callback
 */
function debounce<Args extends any[]>(
  callback: (...args: Args) => void,
  wait: number,
): (...args: Args) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

  return function debouncedCallback(...args: Args): void {
    timeout && clearTimeout(timeout);
    timeout = setTimeout(() => {
      clearTimeout(timeout!);
      callback(...args);
    }, wait);
  };
}

function throttle<Args extends any[]>(
  callback: (...args: Args) => void,
  limit: number,
): (...args: Args) => void {
  let inThrottle: boolean = false;

  return function throttledCallback(...args: Args): void {
    if (!inThrottle) {
      inThrottle = true;
      callback(...args);
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
