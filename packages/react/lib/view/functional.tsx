import { manualWatch } from '@statek/core';
import {
  ComponentType,
  FunctionComponent,
  memo,
  ReactElement,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { useStore } from '../hooks';
import { reactScheduler } from '../scheduler';
import { CurrentView, UpdatesStore, viewsRenderStack } from './stack';
import { extendablePromise } from './utils';

type InferComponentProps<
  C extends ComponentType<any>
> = C extends ComponentType<infer P> ? P : never;

type ComponentPropsComparator<
  C extends ComponentType<any>
> = C extends ComponentType<infer P>
  ? (oldValue: P, newValue: P) => boolean
  : never;

let _i = 0;
export function createFunctionalView<C extends FunctionComponent<any>>(
  BaseComponent: C,
  memoCompareProps?: ComponentPropsComparator<C>,
): C {
  const displayName =
    BaseComponent.displayName ?? BaseComponent.name ?? 'ViewComponent';

  type Props = InferComponentProps<C>;
  function ViewComponent(props: Props, context: any): ReactElement {
    const updatesStore = useStore<UpdatesStore>(() => ({ isUpdating: false }));

    const forceUpdate = useForceUpdate();
    const [currentView] = useState<CurrentView>(() => {
      return { type: BaseComponent, updatesStore, _i: ++_i };
    });

    const silentUpdatesPromise = useMemo(() => extendablePromise(), []);

    viewsRenderStack.push(currentView);

    const reactiveRender = useMemo(
      () => {
        return manualWatch(
          (props: Props, context: any) => {
            return BaseComponent(props, context);
          },
          () => {
            forceUpdate();
          },
          {
            scheduler: reactScheduler,
            name: `${displayName}Render`,
            async onSilentUpdate(silentUpdatePromise) {
              silentUpdatesPromise.add(silentUpdatePromise);

              if (silentUpdatesPromise.isAwaiting) {
                return;
              }

              updatesStore.isUpdating = true;

              await silentUpdatesPromise.wait();

              updatesStore.isUpdating = false;
            },
          },
        );
      },
      // Make sure to update component on fast refresh / hot reload
      [BaseComponent],
    );

    useEffect(() => {
      return () => {
        // If Base Component changes (eg. duea to fast refresh) - stop previous one watching.
        reactiveRender.stop();
      };
    }, [reactiveRender]);

    try {
      // log('view render start');
      return reactiveRender(props, context) as any;
    } catch (errorOrPromise) {
      throw errorOrPromise;
    } finally {
      viewsRenderStack.pop();
    }
  }

  const MemoizedViewComponent = (memo(
    ViewComponent,
    memoCompareProps,
  ) as any) as C;

  if (displayName) {
    MemoizedViewComponent.displayName = displayName;

    Object.defineProperty(MemoizedViewComponent, 'name', {
      value: displayName,
    });
    Object.defineProperty(ViewComponent, 'name', {
      value: displayName + 'View',
    });
  }

  return MemoizedViewComponent;
}

const updateReducer = (num: number): number => (num + 1) % 1_000_000;

export function useForceUpdate(): () => void {
  const [, update] = useReducer(updateReducer, 0);
  return update as () => void;
}

// function useIsFirstRender() {
//   const isFirstRef = useRef(true);

//   useEffect(() => {
//     isFirstRef.current = false;
//   }, []);

//   return isFirstRef.current;
// }

// function useAddEffect() {
//   const effectsSet = useRef<Set<EffectCallback> | null>(null);

//   if (!effectsSet.current) {
//     effectsSet.current = new Set();
//   }

//   useEffect(() => {
//     const effectsToCall = Array.from(effectsSet.current!);
//     effectsSet.current!.clear();

//     const cleaners: Array<() => void> = [];

//     effectsToCall.forEach(effect => {
//       const cleaner = effect();

//       if (cleaner) {
//         cleaners.push(cleaner);
//       }
//     });

//     return () => {
//       cleaners.forEach(cleaner => {
//         cleaner();
//       });
//     };
//   });

//   function addEffect(effect: EffectCallback) {
//     effectsSet.current?.add(effect);

//     return function cancel() {
//       const didRun = !effectsSet.current!.has(effect);
//       effectsSet.current?.delete(effect);

//       const wasAbleToCancel = !didRun;
//       return wasAbleToCancel;
//     };
//   }

//   return addEffect;
// }
