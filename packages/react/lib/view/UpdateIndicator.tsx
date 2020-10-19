import React, { ComponentType, ReactNode, useRef } from 'react';

import { CurrentView, getRenderingView } from './stack';

export interface UpdateIndicatorProps {
  indicator: ReactNode;
}

const viewsUpdateIndicatorsCache = new WeakMap<
  CurrentView,
  ComponentType<UpdateIndicatorProps>
>();

export function getUpdateIndicatorComponent(): ComponentType<
  UpdateIndicatorProps
> {
  const renderingView = getRenderingView()!;

  if (!renderingView) {
    throw new Error(
      `<UpdateIndicator /> can only be rendered directly inside view component.`,
    );
  }

  if (viewsUpdateIndicatorsCache.has(renderingView)) {
    return viewsUpdateIndicatorsCache.get(renderingView)!;
  }

  const { updatesStore } = renderingView;

  function UpdateIndicator({ indicator }: UpdateIndicatorProps) {
    const isUpdating = updatesStore.isUpdating;

    if (!isUpdating) {
      return null;
    }

    return <>{indicator}</>;
  }

  viewsUpdateIndicatorsCache.set(renderingView, UpdateIndicator);

  return UpdateIndicator;
}
