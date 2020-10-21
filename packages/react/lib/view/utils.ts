export function extendablePromise() {
  const promisesStack = new Set<Promise<any>>();

  let isAwaiting = false;

  async function wait() {
    if (isAwaiting) {
      throw new Error('Already awaiting');
    }
    isAwaiting = true;
    let round = 0;
    while (promisesStack.size > 0) {
      round++;
      if (round > 10) {
        throw new Error(`Limit of extendable promise reached`);
      }
      const currentPromises = Array.from(promisesStack);
      promisesStack.clear();
      await Promise.all(currentPromises);
    }
    isAwaiting = false;
  }

  function add(promise: Promise<any>) {
    promisesStack.add(promise);
  }

  return {
    add,
    wait,
    get isAwaiting() {
      return isAwaiting;
    },
  };
}

export type ExtendablePromise = ReturnType<typeof extendablePromise>;
