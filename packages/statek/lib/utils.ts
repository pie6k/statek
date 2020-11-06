export type EventCallback<T> = (value: T) => void;

export function typedOwnPropertyNames<T>(obj: T): Array<keyof T> {
  return Object.getOwnPropertyNames(obj) as Array<keyof T>;
}

export function removeArrayElement<T>(array: T[], item: T) {
  const index = array.indexOf(item);
  if (index === -1) {
    return;
  }

  array.splice(index, 1);
}

export function isSymbol(t: any): t is Symbol {
  return typeof t === 'symbol';
}

export function isPrimitive(input: any) {
  return input !== Object(input);
}

function isPlainObject(input: any) {
  return Object.prototype.toString.call(input) === '[object Object]';
}

export function noop() {}

export function appendSet<T>(set: Set<T>, setToAppend?: Set<T>) {
  if (!setToAppend) {
    return;
  }
  setToAppend.forEach(item => {
    set.add(item);
  });
}

export type ThunkFunction<T> = () => T;

export type Thunk<T> = T | (() => T);

export function createStackCallback<Data = any>(onFinish: () => void) {
  const callsStack: Array<Data | null> = [];
  let isEnabled = true;

  function perform<A extends any[], R>(
    this: any,
    fn: (...args: A) => R,
    args?: A,
    data?: Data,
  ): R {
    callsStack.push(data ?? null);

    try {
      return fn.apply(this, args!);
    } finally {
      callsStack.pop();

      onFinish();
    }
  }

  function isRunning() {
    return callsStack.length > 0;
  }

  function getCurrentData(): Data | null {
    return callsStack[callsStack.length - 1] ?? null;
  }

  const manager = {
    isRunning,
    getCurrentData,
  };

  return [perform, manager] as const;
}

const serializationCache = new WeakMap<any, string>();

export function serialize(input: any): string {
  if (!isPlainObject(input) && serializationCache.has(input)) {
    return serializationCache.get(input)!;
  }

  // Make sure input can be safely serialized without resulting with same output for different input.
  if (process.env.NODE_ENV !== 'production' && !isSerializable(input)) {
    throw new Error('It is not possible to serialize provided value');
  }

  // Dont watch input during serialization!
  return JSON.stringify(input);
}

function isShallowSerializable(value: any): boolean {
  return (
    typeof value === 'undefined' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    Array.isArray(value) ||
    isPlainObject(value)
  );
}

function isSerializable(value: any): boolean {
  let isNestedSerializable;
  if (!isShallowSerializable(value)) {
    return false;
  }
  for (let property in value) {
    if (value.hasOwnProperty(property)) {
      if (!isShallowSerializable(value[property])) {
        return false;
      }
      if (typeof value[property] == 'object') {
        isNestedSerializable = isSerializable(value[property]);
        if (!isNestedSerializable) {
          return false;
        }
      }
    }
  }
  return true;
}

interface ManyToManySide<Left extends object, Right extends object> {
  add(item: Left, otherSideItem: Right): Right;
  get(item: Left): Set<Right> | null;
  remove(item: Left): void;
}

type NamedManyToMany<
  Left extends object,
  Right extends object,
  LeftName extends string,
  RightName extends string
> = {
  [left in LeftName]: ManyToManySide<Left, Right>;
} &
  {
    [right in RightName]: ManyToManySide<Right, Left>;
  };

export function manyToMany<Left extends object, Right extends object>() {
  const leftToRight = new Map<Left, Set<Right>>();
  const rightToLeft = new Map<Right, Set<Left>>();

  const left: ManyToManySide<Left, Right> = {
    add(left: Left, right: Right) {
      let items = leftToRight.get(left);

      if (!items) {
        (items = new Set()), leftToRight.set(left, items);
      }

      items.add(right);

      return right;
    },
    get(left: Left) {
      return leftToRight.get(left) ?? null;
    },
    remove(left: Left) {
      const rights = leftToRight.get(left);

      if (!rights) {
        return;
      }

      rights.forEach(right => {
        const rightLefts = rightToLeft.get(right);

        if (!rightLefts) {
          throw new Error('Incorrect manyToMany state');
        }

        rightLefts.delete(left);
      });

      leftToRight.delete(left);
    },
  };

  const right: ManyToManySide<Right, Left> = {
    add(right: Right, left: Left) {
      let items = rightToLeft.get(right);

      if (!items) {
        (items = new Set()), rightToLeft.set(right, items);
      }

      items.add(left);

      return left;
    },
    get(right: Right) {
      return rightToLeft.get(right) ?? null;
    },
    remove(right: Right) {
      const lefts = rightToLeft.get(right);

      if (!lefts) {
        return;
      }

      lefts.forEach(left => {
        const leftRights = leftToRight.get(left);

        if (!leftRights) {
          throw new Error('Incorrect manyToMany state');
        }

        leftRights.delete(right);
      });

      rightToLeft.delete(right);
    },
  };

  function create<LeftName extends string, RightName extends string>(
    leftToRightRelationName: LeftName,
    rightToLeftRelationName: RightName,
  ): NamedManyToMany<Left, Right, LeftName, RightName> {
    return {
      [leftToRightRelationName]: left,
      [rightToLeftRelationName]: right,
    } as NamedManyToMany<Left, Right, LeftName, RightName>;
  }

  return { create };
}

interface House {
  name: string;
}

interface Person {
  age: number;
}

const foo = manyToMany<House, Person>().create('owners', 'houses');
