import { createChildStore, storeToRawMap } from '../store';
import {
  handleStoreMutationOperation,
  handleStoreReadOperation,
  MutationOperationInfo,
  ReadOperationInfo,
} from '../operations';

const hasOwnProperty = Object.prototype.hasOwnProperty;

function proxifyIterator(
  iterator: IterableIterator<any>,
  isEntries: boolean,
  parent: object,
): IterableIterator<any> {
  const originalNext = iterator.next;
  iterator.next = () => {
    let { done, value } = originalNext.call(iterator);
    if (!done) {
      if (isEntries) {
        value[1] = createChildStore(value[1], parent);
      } else {
        value = createChildStore(value, parent);
      }
    }
    return { done, value };
  };
  return iterator;
}

type Iterable = any;

function has(this: any, key: string) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  handleStoreReadOperation({ target, key, type: 'has' });
  return proto.has.apply(target, arguments as any);
}
function get(this: any, key: string) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;

  handleStoreReadOperation({ target, key, type: 'get' });
  return createChildStore(proto.get.apply(target, arguments as any), target);
}
function add(this: any, key: string) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const hadKey = proto.has.call(target, key);
  const operation: MutationOperationInfo = {
    target,
    key,
    value: key,
    type: 'add',
  };

  // forward the operation before queueing reactions
  const result = proto.add.apply(target, arguments as any);
  if (!hadKey) {
    handleStoreMutationOperation(operation);
  }
  return result;
}
function set(this: any, key: string, value: any) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const hadKey = proto.has.call(target, key);

  if (hadKey) {
    const oldValue = proto.get.call(target, key);
    if (value === oldValue) {
      return;
    }
    const operation: MutationOperationInfo = {
      target,
      key,
      value,
      type: 'set',
    };

    // forward the operation before queueing reactions
    const result = proto.set.apply(target, arguments as any);
    handleStoreMutationOperation(operation);
    return result;
  }

  const operation: MutationOperationInfo = { target, key, value, type: 'add' };

  const result = proto.set.apply(target, arguments as any);

  handleStoreMutationOperation(operation);

  return result;
}
function deleteImplementation(this: any, key: string) {
  const target = storeToRawMap.get(this);
  const operation: MutationOperationInfo = {
    target,
    key,
    type: 'delete',
  };
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const hadKey = proto.has.call(target, key);
  // forward the operation before queueing reactions
  const result = proto.delete.apply(target, arguments as any);
  if (hadKey) {
    handleStoreMutationOperation(operation);
  }
  return result;
}
function clear(this: any) {
  const target = storeToRawMap.get(this);
  const operation: MutationOperationInfo = { target, type: 'clear' };

  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const hadItems = target.size !== 0;
  // forward the operation before queueing reactions
  const result = proto.clear.apply(target, arguments as any);
  if (hadItems) {
    handleStoreMutationOperation(operation);
  }
  return result;
}
function forEach(this: any, callback: any, ...args: any[]) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const operation: ReadOperationInfo = { target, type: 'iterate' };
  handleStoreReadOperation(operation);
  // swap out the raw values with their observable pairs
  // before passing them to the callback
  const wrappedCallback = (value: any, ...rest: [any]) =>
    callback(createChildStore(value, target), ...rest);
  return proto.forEach.call(target, wrappedCallback, ...args);
}
function keys(this: any) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Set<any>;
  handleStoreReadOperation({ target, type: 'iterate' });
  return proto.keys.apply(target, arguments as any);
}
function values(this: any) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const operation: ReadOperationInfo = { target, type: 'iterate' };
  handleStoreReadOperation(operation);
  const iterator = proto.values.apply(target, arguments as any);
  return proxifyIterator(iterator, false, target);
}
function entries(this: any) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const operation: ReadOperationInfo = { target, type: 'iterate' };
  handleStoreReadOperation(operation);
  const iterator = proto.entries.apply(target, arguments as any);
  return proxifyIterator(iterator, true, target);
}

function symbolIterator(this: any) {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  const operation: ReadOperationInfo = { target, type: 'iterate' };
  handleStoreReadOperation(operation);
  const iterator = proto[Symbol.iterator].apply(target, arguments as any);
  return proxifyIterator(iterator, target instanceof Map, target);
}

function getSize(this: any): number {
  const target = storeToRawMap.get(this);
  const proto = Reflect.getPrototypeOf(this) as Iterable;
  handleStoreReadOperation({ target, type: 'iterate' });
  return Reflect.get(proto, 'size', target);
}

const mapLikeProxyWrappers = {
  [Symbol.iterator]: symbolIterator,
  has,
  get,
  add,
  set,
  delete: deleteImplementation,
  clear,
  forEach,
  keys,
  values,
  entries,
  get size() {
    return getSize.apply(this);
  },
};

export const arrayProxyHandlers = mapLikeProxyWrappers;

export const mapLikeProxyHandlers: ProxyHandler<any> = {
  // Instead of creating entire map of handlers - it'll be dynamic.
  // When trying to get each proxy handler.
  // If we're able to cover it - use 'proxy-like' version. Otherwise - return normal callback from
  // nativ object.
  get(target: any, key: string, receiver: any) {
    // get proxy method either from instrumentations, or if not avaliable - from target element.
    // instrument methods and property accessors to be reactive
    target = hasOwnProperty.call(mapLikeProxyWrappers, key)
      ? mapLikeProxyWrappers
      : target;

    return Reflect.get(target, key, receiver);
  },
};
