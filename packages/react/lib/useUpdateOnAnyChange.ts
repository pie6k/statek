import { useEffect } from 'react';
import { watchAllChanges } from 'statek';
import { reactScheduler } from './scheduler';
import { useForceUpdate } from './utils/useForceUpdate';

export function useUpdateOnAnyChange<T extends object>(storePart: T) {
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    return watchAllChanges(storePart, forceUpdate, {
      scheduler: reactScheduler,
    });
  }, [storePart]);
}
