type Callback<A extends any[], R, Ctx extends object = any> = (
  this: Ctx,
  ...args: A
) => R;

export function createTargetMarkerCallback() {
  const markedItems = new WeakMap<any, number>();
  function createMarkedCallback<A extends any[], R, Ctx extends object = any>(
    callback: Callback<A, R, Ctx>,
  ) {
    return function wrappedCallback(this: Ctx, ...args: A): R {
      let stackLevel = markedItems.get(this);
      if (stackLevel === undefined) {
        stackLevel = 1;
      } else {
        stackLevel++;
      }

      markedItems.set(this, stackLevel);

      try {
        return callback.apply(this, args);
      } catch (error) {
        throw error;
      } finally {
        let stackLevelNow = markedItems.get(this);

        if (stackLevelNow === undefined) {
          throw new Error('Incorrect stack level implementation');
        }

        stackLevelNow--;

        if (stackLevelNow === 0) {
          markedItems.delete(this);
        }
      }
    };
  }

  function isTargetMarked(target: object) {
    return markedItems.has(target);
  }

  const manager = {
    isTargetMarked,
  };

  return [createMarkedCallback, manager] as const;
}

export const [
  createIterationCallback,
  { isTargetMarked: isTargetBeingIterated },
] = createTargetMarkerCallback();
