import { observable } from '../observable';
import {
  handleObservableReadOperation,
  handleObservableMutationOperation,
  hasRunningReaction,
} from '../reactionRunner';
import { registeredObservablesMap, rawToObservableMap } from '../internals';

const hasOwnProperty = Object.prototype.hasOwnProperty;

function findObservable(obj: object) {
  const observableObj = rawToObservableMap.get(obj);
  if (hasRunningReaction() && typeof obj === 'object' && obj !== null) {
    if (observableObj) {
      return observableObj;
    }
    return observable(obj);
  }
  return observableObj || obj;
}

function patchIterator(iterator: any, isEntries: boolean) {
  const originalNext = iterator.next;
  iterator.next = () => {
    let { done, value } = originalNext.call(iterator);
    if (!done) {
      if (isEntries) {
        value[1] = findObservable(value[1]);
      } else {
        value = findObservable(value);
      }
    }
    return { done, value };
  };
  return iterator;
}

type Iterable = any;

const instrumentations = {
  has(key: string) {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, key, type: 'has' });
    return proto.has.apply(target, arguments as any);
  },
  get(key: string) {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;

    handleObservableReadOperation({ target, key, type: 'get' });
    return findObservable(proto.get.apply(target, arguments as any));
  },
  add(key: string) {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    const hadKey = proto.has.call(target, key);
    // forward the operation before queueing reactions
    const result = proto.add.apply(target, arguments as any);
    if (!hadKey) {
      handleObservableMutationOperation({
        target,
        key,
        value: key,
        type: 'add',
      });
    }
    return result;
  },
  set(key: string, value: any) {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    const hadKey = proto.has.call(target, key);
    const oldValue = proto.get.call(target, key);
    // forward the operation before queueing reactions
    const result = proto.set.apply(target, arguments as any);
    if (!hadKey) {
      handleObservableMutationOperation({ target, key, value, type: 'add' });
    } else if (value !== oldValue) {
      handleObservableMutationOperation({
        target,
        key,
        value,
        oldValue,
        type: 'set',
      });
    }
    return result;
  },
  delete(key: string) {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    const hadKey = proto.has.call(target, key);
    const oldValue = proto.get ? proto.get.call(target, key) : undefined;
    // forward the operation before queueing reactions
    const result = proto.delete.apply(target, arguments as any);
    if (hadKey) {
      handleObservableMutationOperation({
        target,
        key,
        oldValue,
        type: 'delete',
      });
    }
    return result;
  },
  clear() {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    const hadItems = target.size !== 0;
    const oldTarget = target instanceof Map ? new Map(target) : new Set(target);
    // forward the operation before queueing reactions
    const result = proto.clear.apply(target, arguments as any);
    if (hadItems) {
      handleObservableMutationOperation({ target, oldTarget, type: 'clear' });
    }
    return result;
  },
  forEach(cb: any, ...args: any[]) {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    // swap out the raw values with their observable pairs
    // before passing them to the callback
    const wrappedCb = (value: any, ...rest: [any]) =>
      cb(findObservable(value), ...rest);
    return proto.forEach.call(target, wrappedCb, ...args);
  },
  keys() {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Set<any>;
    handleObservableReadOperation({ target, type: 'iterate' });
    return proto.keys.apply(target, arguments as any);
  },
  values() {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    const iterator = proto.values.apply(target, arguments as any);
    return patchIterator(iterator, false);
  },
  entries() {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    const iterator = proto.entries.apply(target, arguments as any);
    return patchIterator(iterator, true);
  },
  [Symbol.iterator]() {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    const iterator = proto[Symbol.iterator].apply(target, arguments as any);
    return patchIterator(iterator, target instanceof Map);
  },
  get size(): number {
    const target = registeredObservablesMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    return Reflect.get(proto, 'size', target);
  },
};

export default {
  get(target: any, key: string, receiver: any) {
    // instrument methods and property accessors to be reactive
    target = hasOwnProperty.call(instrumentations, key)
      ? instrumentations
      : target;
    return Reflect.get(target, key, receiver);
  },
};
