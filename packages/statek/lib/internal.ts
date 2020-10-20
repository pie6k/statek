import { createStackCallback, noop } from './utils';

export const [allowInternal, allowInternalManager] = createStackCallback(noop);

export function warnIfUsingInternal(internalName: string) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (allowInternalManager.isRunning()) {
    return;
  }

  console.warn(
    `You're using internal function of "statek" - ${internalName}. If you're sure what you're doing - wrap your call inside allowInternal(() => yourCode) to dismiss this warning.`,
  );
}
