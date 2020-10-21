import { manualWatch, store } from 'statek';
import {
  Component,
  ComponentClass,
  ComponentType,
  PureComponent,
  ReactNode,
} from 'react';
import { reactScheduler } from '../scheduler';
import { UpdatesStore, viewsRenderStack } from './stack';
import { extendablePromise, ExtendablePromise } from './utils';

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

const unsubscribeSymbol = Symbol('unsubscribeSymbol');
const updatesStoreSymbol = Symbol('updatesStoreSymbol');
const silentUpdatesSymbol = Symbol('silentUpdatesSymbol');

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

    private [updatesStoreSymbol]: UpdatesStore;
    private [unsubscribeSymbol]: () => void;
    private [silentUpdatesSymbol]: ExtendablePromise;
    // private [updatesStoreSymbol] = store<UpdatesStore>({ isUpdating: false });
    // private [unsubscribeSymbol] = () => {};
    // private [silentUpdatesSymbol] = extendablePromise();

    constructor(props: Props) {
      super(props);

      const baseInstance: any = BaseComponent.apply(this, [props]);

      this.state = baseInstance.state;

      const reactiveRender = manualWatch<[], ReactNode>(
        () => {
          try {
            viewsRenderStack.push({
              type: BaseComponent,
              updatesStore: this[updatesStoreSymbol],
            });
            return Reflect.apply(BaseComponent.prototype.render, this, []);
          } catch (errorOrPromise) {
            throw errorOrPromise;
          } finally {
            viewsRenderStack.pop();
          }
        },
        () => {
          this.forceUpdate();
        },
        {
          context: this,
          scheduler: reactScheduler,
          onSilentUpdate: async silentUpdatePromise => {
            this[silentUpdatesSymbol].add(silentUpdatePromise);

            if (this[silentUpdatesSymbol].isAwaiting) {
              return;
            }

            this[updatesStoreSymbol].isUpdating = true;

            await this[silentUpdatesSymbol].wait();

            this[updatesStoreSymbol].isUpdating = false;
          },
        },
      );

      this[updatesStoreSymbol] = store<UpdatesStore>({ isUpdating: false });
      this[unsubscribeSymbol] = reactiveRender.stop;
      this[silentUpdatesSymbol] = extendablePromise();
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
