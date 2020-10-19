import { ComponentType, FunctionComponent, ComponentClass } from 'react';

export function isFunctionalComponent<P>(
  Component: ComponentType<P>,
): Component is FunctionComponent<P> {
  if (typeof Component !== 'function') {
    return false;
  }

  if (Component?.prototype?.isReactComponent) {
    return false;
  }

  return true;
}

export function isClassComponent<P>(
  Component: ComponentType<P>,
): Component is ComponentClass<P> {
  if (typeof Component !== 'function') {
    return false;
  }

  if (Component?.prototype?.isReactComponent) {
    return true;
  }

  return false;
}
