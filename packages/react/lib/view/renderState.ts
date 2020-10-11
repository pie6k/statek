import React, { useRef, useMemo, ComponentType } from 'react';
import { warnOnce } from './warnOnce';

interface RenderStatus {
  currentRenderingReactiveComponent: ComponentType<any> | null;
}

interface Ref {
  current: any;
}

interface Internals {
  ReactCurrentDispatcher: Ref;
  ReactCurrentOwner: Ref;
}

export const internals = (React as any)
  .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as Internals;

export const renderStatus: RenderStatus = {
  currentRenderingReactiveComponent: null,
};

function getCurrentlyRenderingType() {
  if (!internals) {
    return false;
  }

  return internals?.ReactCurrentOwner?.current?.type;
}

const DISABLE = true;

export function warnIfAccessingInNonReactiveComponent() {
  if (DISABLE) {
    return;
  }
  const currentlyRenderingType = getCurrentlyRenderingType();
  if (!currentlyRenderingType) {
    return;
  }

  if (!renderStatus.currentRenderingReactiveComponent) {
    const niceName =
      currentlyRenderingType?.displayName ??
      currentlyRenderingType?.name ??
      'Unknown';
    warnOnce(
      currentlyRenderingType,
      `Accessing store property inside react component that is not wrapped in <${niceName} />`,
    );
  }
}
