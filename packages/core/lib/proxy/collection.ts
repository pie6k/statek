import { lazyCreateObservable, observableToRawMap } from '../observable';
import {
  handleObservableMutationOperation,
  handleObservableReadOperation,
} from '../operations';

const hasOwnProperty = Object.prototype.hasOwnProperty;

function proxifyIterator(iterator: any, isEntries: boolean) {
  const originalNext = iterator.next;
  iterator.next = () => {
    let { done, value } = originalNext.call(iterator);
    if (!done) {
      if (isEntries) {
        value[1] = lazyCreateObservable(value[1]);
      } else {
        value = lazyCreateObservable(value);
      }
    }
    return { done, value };
  };
  return iterator;
}

type Iterable = any;

const mapLikeProxyWrappers = {
  has(key: string) {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, key, type: 'has' });
    return proto.has.apply(target, arguments as any);
  },
  get(key: string) {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;

    handleObservableReadOperation({ target, key, type: 'get' });
    return lazyCreateObservable(proto.get.apply(target, arguments as any));
  },
  add(key: string) {
    const target = observableToRawMap.get(this);
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
    const target = observableToRawMap.get(this);
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
        type: 'set',
      });
    }
    return result;
  },
  delete(key: string) {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    const hadKey = proto.has.call(target, key);
    // forward the operation before queueing reactions
    const result = proto.delete.apply(target, arguments as any);
    if (hadKey) {
      handleObservableMutationOperation({
        target,
        key,
        type: 'delete',
      });
    }
    return result;
  },
  clear() {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    const hadItems = target.size !== 0;
    // forward the operation before queueing reactions
    const result = proto.clear.apply(target, arguments as any);
    if (hadItems) {
      handleObservableMutationOperation({ target, type: 'clear' });
    }
    return result;
  },
  forEach(this: any, callback: any, ...args: any[]) {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    // swap out the raw values with their observable pairs
    // before passing them to the callback
    const wrappedCallback = (value: any, ...rest: [any]) =>
      callback(lazyCreateObservable(value), ...rest);
    return proto.forEach.call(target, wrappedCallback, ...args);
  },
  keys() {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Set<any>;
    handleObservableReadOperation({ target, type: 'iterate' });
    return proto.keys.apply(target, arguments as any);
  },
  values() {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    const iterator = proto.values.apply(target, arguments as any);
    return proxifyIterator(iterator, false);
  },
  entries() {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    const iterator = proto.entries.apply(target, arguments as any);
    return proxifyIterator(iterator, true);
  },
  [Symbol.iterator]() {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    const iterator = proto[Symbol.iterator].apply(target, arguments as any);
    return proxifyIterator(iterator, target instanceof Map);
  },
  get size(): number {
    const target = observableToRawMap.get(this);
    const proto = Reflect.getPrototypeOf(this) as Iterable;
    handleObservableReadOperation({ target, type: 'iterate' });
    return Reflect.get(proto, 'size', target);
  },
};

export const mapLikeProxyHandlers: ProxyHandler<any> = {
  // Instead of creating entire map of handlers - it'll be dynamic.
  // When trying to get each proxy handler.
  // If we're able to cover it - use 'proxy-like' version. Otherwise - return normal callback from
  // native object.
  get(target: any, key: string, receiver: any) {
    // get proxy method either from instrumentations, or if not avaliable - from target element.
    // instrument methods and property accessors to be reactive
    target = hasOwnProperty.call(mapLikeProxyWrappers, key)
      ? mapLikeProxyWrappers
      : target;

    return Reflect.get(target, key, receiver);
  },
};
