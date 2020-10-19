import { dontWatch, manualWatch, store } from '@statek/core';
import {
  Component,
  ComponentClass,
  ComponentType,
  PureComponent,
  ReactNode,
} from 'react';
import { reactScheduler } from '../scheduler';
import { UpdatesStore, viewsRenderStack } from './stack';

type InferComponentProps<
  C extends ComponentType<any>
> = C extends ComponentType<infer P> ? P : never;

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
const updatesStoreSymbol = Symbol('unsubscribe');
const isFirstRenderSymbol = Symbol('unsubscribe');
const lastRenderResult = Symbol('unsubscribe');

export function createClassView<C extends ComponentClass<any, any>>(
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

    private [updatesStoreSymbol] = store<UpdatesStore>({ isUpdating: false });
    private [unsubscribeSymbol] = () => {};
    private [isFirstRenderSymbol] = false;
    private [lastRenderResult]: ReactNode = null;

    constructor(props: Props, context: any) {
      super(props);

      const baseInstance: any = BaseComponent.apply(this, [props, context]);

      this.state = baseInstance.state;

      const runRender = () => {
        try {
          viewsRenderStack.push({
            type: BaseComponent,
            updatesStore: this[updatesStoreSymbol],
          });
          const renderResult = Reflect.apply(
            BaseComponent.prototype.render,
            this,
            [],
          );
          this[lastRenderResult] = renderResult;
          return renderResult;
        } catch (errorOrPromise) {
          if (!(errorOrPromise instanceof Promise)) {
            throw errorOrPromise;
          }

          if (this[isFirstRenderSymbol]) {
            throw errorOrPromise;
          }

          dontWatch(() => {
            this[updatesStoreSymbol].isUpdating = true;
          });

          errorOrPromise.then(() => {
            this[updatesStoreSymbol].isUpdating = false;
            this.forceUpdate();
          });

          return this[lastRenderResult];
        } finally {
          viewsRenderStack.pop();
        }
      };

      const reactiveRender = manualWatch<[], ReactNode>(
        runRender,
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
