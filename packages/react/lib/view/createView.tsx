import { ComponentType, FunctionComponent, useReducer } from 'react';
import { createClassView } from './class';
import { isClassComponent, isFunctionalComponent } from './componentTypes';
import { createFunctionalView } from './functional';
import {
  getUpdateIndicatorComponent,
  UpdateIndicatorProps,
} from './UpdateIndicator';

type ComponentPropsComparator<C extends PropsOrComponent> = InputComponent<
  C
> extends FunctionComponent<infer P>
  ? (oldValue: P, newValue: P) => boolean
  : never;

const registeredViewComponents = new WeakSet<ComponentType<any>>();

interface ViewConfig<C extends PropsOrComponent> {
  memoCompareProps?: ComponentPropsComparator<C>;
}

interface ViewPublicProps {
  suspenseFallback?: string;
}

type PropsOrComponent = ComponentType<any> | { [key: string]: any };

type InputComponent<C extends PropsOrComponent> = C extends ComponentType<any>
  ? C
  : ComponentType<C>;

type ViewComponent<C extends PropsOrComponent> = (C extends ComponentType<any>
  ? C
  : ComponentType<C & ViewPublicProps>) & {
  UpdateIndicator: ComponentType<UpdateIndicatorProps>;
};

const createdViewsCache = new WeakMap<
  InputComponent<any>,
  ViewComponent<any>
>();

export function view<C extends PropsOrComponent>(
  Comp: InputComponent<C>,
  config?: ViewConfig<C>,
): ViewComponent<C> {
  const isViewAlready = registeredViewComponents.has(Comp);

  if (isViewAlready) {
    return Comp as ViewComponent<C>;
  }

  if (createdViewsCache.has(Comp)) {
    return createdViewsCache.get(Comp)!;
  }

  function getReactiveComponent(): InputComponent<C> {
    if (isFunctionalComponent(Comp)) {
      return createFunctionalView(
        Comp,
        config?.memoCompareProps,
      ) as InputComponent<C>;
    }

    if (isClassComponent(Comp)) {
      return createClassView(Comp) as InputComponent<C>;
    }

    throw new Error('Incorrect input provided to view function');
  }

  const ViewComponent = getReactiveComponent();

  if (Comp.displayName || Comp.name) {
    ViewComponent.displayName = `${Comp.displayName ?? Comp.name}View`;
  }

  registeredViewComponents.add(ViewComponent);
  createdViewsCache.set(Comp, ViewComponent);

  Object.defineProperty(ViewComponent, 'UpdateIndicator', {
    get() {
      return view(getUpdateIndicatorComponent(Comp));
    },
  });

  return ViewComponent as ViewComponent<C>;
}
