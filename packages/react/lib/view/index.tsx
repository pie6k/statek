import { lazyWatch } from '@statek/core';
import {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  memo,
  ReactElement,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { isClassComponent, isFunctionalComponent } from '../componentTypes';
import { reactScheduler } from '../scheduler';
import { renderStatus } from './renderState';
export {
  renderStatus,
  warnIfAccessingInNonReactiveComponent,
} from './renderState';

type InferComponentProps<
  C extends ComponentType<any>
> = C extends ComponentType<infer P> ? P : never;

type ComponentPropsComparator<
  C extends ComponentType<any>
> = C extends ComponentType<infer P>
  ? (oldValue: P, newValue: P) => boolean
  : never;

const registeredViewComponents = new WeakSet<ComponentType<any>>();

function createFunctionalView<C extends FunctionComponent<any>>(
  BaseComponent: C,
  memoCompareProps?: ComponentPropsComparator<C>,
): C {
  type Props = InferComponentProps<C>;
  const ReactiveFunctionalComponent: FunctionComponent<Props> = function ReactiveComponent(
    props: Props,
    context,
  ): ReactElement<any, any> {
    renderStatus.currentRenderingReactiveComponent = BaseComponent;

    const forceUpdate = useForceUpdate();
    const reactiveRender = useMemo(
      () => {
        return lazyWatch(
          (props: Props, context: any) => {
            return BaseComponent(props, context);
          },
          () => {
            reactScheduler(forceUpdate);
          },
        );
      },
      // Make sure to update component on fast refresh / hot reload
      [BaseComponent],
    );

    useEffect(() => {
      return () => reactiveRender.unsubscribe();
    }, [reactiveRender]);

    try {
      return reactiveRender(props, context) as any;
    } catch (error) {
      throw error;
    } finally {
      renderStatus.currentRenderingReactiveComponent = null;
    }
  };

  return (memo(ReactiveFunctionalComponent, memoCompareProps) as any) as C;
}

const methodsToBind = [
  'componentDidCatch',
  'componentDidMount',
  'componentDidUpdate',
  // 'componentWillUnmount',
  'shouldComponentUpdate',
  'getSnapshotBeforeUpdate',
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

  type E = keyof Component;

  class ReactiveClassComponent extends Component<Props> {
    static getDerivedStateFromProps: any;
    static getDerivedStateFromError: any;
    static contextType: any;

    private [unsubscribeSymbol]: () => void;

    constructor(props: Props, context: any) {
      super(props);
      // super(props);
      const baseInstance: any = BaseComponent.apply(this, [props, context]);

      this.state = baseInstance.state;

      const reactiveRender = lazyWatch(
        BaseComponent.prototype.render,
        () => {
          reactScheduler(() => {
            this.forceUpdate();
          });
        },
        this,
      );

      this[unsubscribeSymbol] = reactiveRender.unsubscribe;

      // @ts-ignore
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
