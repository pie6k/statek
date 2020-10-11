import React, {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  memo,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isObservable, observe, getObservableRaw } from '../observable';
import { renderStatus } from './renderState';

export {
  warnIfAccessingInNonReactiveComponent,
  renderStatus,
} from './renderState';

type InferComponentProps<
  C extends ComponentType<any>
> = C extends ComponentType<infer P> ? P : never;

type ComponentPropsComparator<
  C extends ComponentType<any>
> = C extends ComponentType<infer P>
  ? (oldValue: P, newValue: P) => boolean
  : never;

const COMPONENT = Symbol('owner component');

const viewsSet = new Set<ComponentType<any>>();

type ClassStateBase = {
  [COMPONENT]: any;
};

function isFunctionalComponent<P>(
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

function useValueGetter<T>(value: T) {
  const valueRef = useRef(value);

  valueRef.current = value;

  return function get() {
    return valueRef.current;
  };
}

function functionalView<C extends FunctionComponent<any>>(
  BaseComponent: C,
  memoCompareProps?: ComponentPropsComparator<C>,
): C {
  type Props = InferComponentProps<C>;
  const ReactiveFunctionalComponent: FunctionComponent<Props> = function ReactiveComponent(
    props: Props,
  ): ReactElement<any, any> {
    renderStatus.currentRenderingReactiveComponent = BaseComponent;

    const getProps = useValueGetter(props);

    const [, setState] = useState<{}>();
    const render = useMemo(
      () => {
        return observe(
          () => {
            return BaseComponent(getProps());
          },
          {
            scheduler: () => {
              setState({});
            },
            lazy: true,
          },
        );
      },
      // Adding the original Comp here is necessary to make React Hot Reload work
      // it does not affect behavior otherwise
      [BaseComponent],
    );

    useEffect(() => {
      return () => render.unsubscribe();
    }, []);

    try {
      // run the reactive render instead of the original one
      return render() as any;
    } catch (error) {
      throw error;
    } finally {
      renderStatus.currentRenderingReactiveComponent = null;
    }
  };

  return (memo(ReactiveFunctionalComponent, memoCompareProps) as any) as C;
}

type E = {
  [key in keyof Component]: any;
};

const methodsToCopy = [
  'componentDidCatch',
  'componentDidMount',
  'componentDidUpdate',
  'componentWillUnmount',
  'shouldComponentUpdate',
  'getSnapshotBeforeUpdate',
] as const;

function classView<C extends ComponentClass<any, any>>(BaseComponent: C): C {
  type Props = InferComponentProps<C>;

  type E = keyof Component;

  // class ReactiveClassComponent extends Component<Props> {
  //   constructor(props) {
  //     super(props);

  //     this.render = observe(BaseComponent.prototype.render, {
  //       scheduler: () => {
  //         this.forceUpdate();
  //       },
  //       lazy: true,
  //     });

  //     methodsToCopy.forEach(methodName => {
  //       if (BaseComponent.prototype[methodName]) {
  //         this[methodName] = BaseComponent.prototype[methodName].bind(this);
  //       }
  //     });

  //     this.componentDidMount = BaseComponent.prototype.componentDidMount.bind(
  //       this,
  //     );
  //   }
  // }
  // a HOC which overwrites render, shouldComponentUpdate and componentWillUnmount
  // it decides when to run the new reactive methods and when to proxy to the original methods
  throw new Error('Not implemented');
  // class ReactiveClassComponent extends BaseComponent<P, ClassStateBase> {
  //   constructor(props: P) {
  //     super(props);

  //     const initialState: ClassStateBase = {
  //       [COMPONENT]: this,
  //     };

  //     // const initialState: S & ClassStateBase

  //     // @ts-ignore
  //     this.state = initialState;

  //     // create a reactive render for the component
  //     this.render = observe(this.render, {
  //       scheduler: () => this.setState({}),
  //       lazy: true,
  //     });
  //   }

  //   render() {
  //     renderStatus.currentRenderingReactiveComponent = BaseComponent;
  //     try {
  //       return super.render();
  //     } finally {
  //       renderStatus.currentRenderingReactiveComponent = null;
  //     }
  //   }

  //   // react should trigger updates on prop changes, while easyState handles store changes
  //   shouldComponentUpdate(
  //     nextProps: P,
  //     nextState: ClassStateBase,
  //     nextContext: any,
  //   ) {
  //     const { props, state } = this;

  //     // respect the case when the user defines a shouldComponentUpdate
  //     if (super.shouldComponentUpdate) {
  //       return super.shouldComponentUpdate(nextProps, nextState, nextContext);
  //     }

  //     // return true if it is a reactive render or state changes
  //     if (state !== nextState) {
  //       return true;
  //     }

  //     // the component should update if any of its props shallowly changed value
  //     const keys = typedKeys(props);
  //     const nextKeys = typedKeys(nextProps);

  //     return (
  //       nextKeys.length !== keys.length ||
  //       nextKeys.some(key => props[key] !== nextProps[key])
  //     );
  //   }

  //   // add a custom deriveStoresFromProps lifecyle method
  //   static getDerivedStateFromProps(props: P, state: ClassStateBase) {
  //     // @ts-ignore
  //     if (super.deriveStoresFromProps) {
  //       // inject all local stores and let the user mutate them directly
  //       const stores = mapStateToStores(state);
  //       // @ts-ignore
  //       super.deriveStoresFromProps(props, ...stores);
  //     }
  //     // respect user defined getDerivedStateFromProps
  //     // @ts-ignore
  //     if (super.getDerivedStateFromProps) {
  //       // @ts-ignore
  //       return super.getDerivedStateFromProps(props, state);
  //     }
  //     return null;
  //   }

  //   componentWillUnmount() {
  //     // call user defined componentWillUnmount
  //     if (super.componentWillUnmount) {
  //       super.componentWillUnmount();
  //     }
  //     // clean up memory used by Easy State
  //     unobserve(this.render as Reaction<any, any>);
  //   }
  // }

  // return ReactiveClassComponent;
}

export function view<C extends ComponentType<any>>(
  Comp: C,
  memoCompareProps?: ComponentPropsComparator<C>,
): C {
  const existingView = viewsSet.has(Comp);

  if (existingView) {
    return Comp;
  }

  function getReactiveComponent(): C {
    if (isFunctionalComponent(Comp)) {
      return functionalView(Comp, memoCompareProps) as C;
    }

    throw new Error('Not implemented');

    // return classView(Comp);
  }

  const ReactiveComponent = getReactiveComponent();

  if (Comp.displayName) {
    ReactiveComponent.displayName = `Reactive${Comp.displayName}`;
  }

  viewsSet.add(ReactiveComponent);

  return ReactiveComponent;
}

function typedKeys<O>(input: O): Array<keyof O> {
  return Object.keys(input) as Array<keyof O>;
}
