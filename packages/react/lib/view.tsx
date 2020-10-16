import { manualWatch } from '@statek/core';
import {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  memo,
  PureComponent,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { actSync } from '../test/utils';
import { isClassComponent, isFunctionalComponent } from './componentTypes';
import { reactScheduler } from './scheduler';

type InferComponentProps<
  C extends ComponentType<any>
> = C extends ComponentType<infer P> ? P : never;

type ComponentPropsComparator<
  C extends ComponentType<any>
> = C extends ComponentType<infer P>
  ? (oldValue: P, newValue: P) => boolean
  : never;

const registeredViewComponents = new WeakSet<ComponentType<any>>();

const viewsRenderStack: any[] = [];

function createFunctionalView<C extends FunctionComponent<any>>(
  BaseComponent: C,
  memoCompareProps?: ComponentPropsComparator<C>,
): C {
  type Props = InferComponentProps<C>;
  const ReactiveFunctionalComponent: FunctionComponent<Props> = function ReactiveComponent(
    props: Props,
    context,
  ): ReactElement<any, any> {
    viewsRenderStack.push(BaseComponent);

    const forceUpdate = useForceUpdate();
    const reactiveRender = useMemo(
      () => {
        return manualWatch(
          (props: Props, context: any) => {
            return BaseComponent(props, context);
          },
          () => {
            forceUpdate();
          },
          { scheduler: reactScheduler },
        );
      },
      // Make sure to update component on fast refresh / hot reload
      [BaseComponent],
    );

    useEffect(() => {
      return () => reactiveRender.stop();
    }, [reactiveRender]);

    try {
      return reactiveRender(props, context) as any;
    } catch (error) {
      throw error;
    } finally {
      viewsRenderStack.pop();
    }
  };

  return (memo(ReactiveFunctionalComponent, memoCompareProps) as any) as C;
}

const methodsToBind = [
  'componentDidCatch',
  'componentDidMount',
  'componentDidUpdate',
  'shouldComponentUpdate',
  'getSnapshotBeforeUpdate',
  // We're not automatically binding unmount, as we'll have to unsubscribe reactive render
  // 'componentWillUnmount',
] as const;

const staticMethodsToBind = [
  'getDerivedStateFromProps',
  'getDerivedStateFromError',
  'contextType',
] as const;

const unsubscribeSymbol = Symbol('unsubscribe');

function createClassView<C extends ComponentClass<any, any>>(
  BaseComponent: C,
): C {
  type Props = InferComponentProps<C>;

  // Pick PureComponent or Component according to original component.
  const BaseReactComponent =
    Object.getPrototypeOf(BaseComponent) === PureComponent
      ? PureComponent
      : Component;

  class ReactiveClassComponent extends BaseReactComponent<Props> {
    static getDerivedStateFromProps: any;
    static getDerivedStateFromError: any;
    static contextType: any;

    private [unsubscribeSymbol]: () => void;

    constructor(props: Props, context: any) {
      super(props);

      const baseInstance: any = BaseComponent.apply(this, [props, context]);

      this.state = baseInstance.state;

      const reactiveRender = manualWatch<[], ReactNode>(
        BaseComponent.prototype.render,
        () => {
          this.forceUpdate();
        },
        { context: this, scheduler: reactScheduler },
      );

      this[unsubscribeSymbol] = reactiveRender.stop;

      this.render = reactiveRender;

      methodsToBind.forEach(methodToBindName => {
        const existingMethod =
          baseInstance[methodToBindName] ||
          BaseComponent.prototype[methodToBindName];

        if (existingMethod) {
          this[methodToBindName] = existingMethod.bind(this);
        }
      });

      this.componentWillUnmount = () => {
        this[unsubscribeSymbol]();
        const unmountCallback =
          baseInstance.componentWillUnmount ||
          BaseComponent.prototype.componentWillUnmount;

        if (unmountCallback) {
          unmountCallback.apply(this);
        }
      };
    }
  }

  staticMethodsToBind.forEach(staticMethodToBindName => {
    if (BaseComponent[staticMethodToBindName]) {
      ReactiveClassComponent[staticMethodToBindName] =
        BaseComponent[staticMethodToBindName];
    }
  });

  return (ReactiveClassComponent as any) as C;
}

export function view<C extends ComponentType<any>>(
  Comp: C,
  memoCompareProps?: ComponentPropsComparator<C>,
): C {
  const isViewAlready = registeredViewComponents.has(Comp);

  if (isViewAlready) {
    return Comp;
  }

  function getReactiveComponent(): C {
    if (isFunctionalComponent(Comp)) {
      return createFunctionalView(Comp, memoCompareProps) as C;
    }

    if (isClassComponent(Comp)) {
      return createClassView(Comp) as C;
    }

    throw new Error('Incorrect input provided to view function');
  }

  const ReactiveComponent = getReactiveComponent();

  if (Comp.displayName) {
    ReactiveComponent.displayName = `Reactive${Comp.displayName}`;
  }

  registeredViewComponents.add(ReactiveComponent);

  return ReactiveComponent;
}

const updateReducer = (num: number): number => (num + 1) % 1_000_000;

export function useForceUpdate(): () => void {
  const [, update] = useReducer(updateReducer, 0);
  return update as () => void;
}
