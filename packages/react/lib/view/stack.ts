import { ComponentType } from 'react';

export interface UpdatesStore {
  isUpdating: boolean;
}

export interface CurrentView {
  _i: number;
  type: ComponentType<any>;
  updatesStore: UpdatesStore;
}

export const viewsRenderStack: CurrentView[] = [];

export function getRenderingView(): CurrentView | null {
  if (viewsRenderStack.length === 0) {
    return null;
  }

  return viewsRenderStack[viewsRenderStack.length - 1];
}
