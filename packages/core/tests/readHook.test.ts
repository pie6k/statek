/**
 * @jest-environment jsdom
 */
import {
  store,
  watchSelected,
  registerReadOperationReactionHook,
  watch,
} from '@statek/core/lib/';

describe('readOperationHook', () => {
  it('calls read operation if no reaction found', () => {
    const spy = jest.fn();
    const stop = registerReadOperationReactionHook(spy);

    const obj = store({ foo: 1 });

    obj.foo;

    expect(spy).toBeCalledTimes(1);

    stop();
  });

  it('hook receives proper reference to target object', () => {
    const objRaw = { foo: 1 };

    let foundObj: any;
    const spy = jest.fn();
    const stop = registerReadOperationReactionHook(operation => {
      foundObj = operation.target;
      return null;
    });

    const obj = store(objRaw);

    obj.foo;

    expect(foundObj).toBe(objRaw);

    stop();
  });

  it('dont call hook if reaction is found', () => {
    const spy = jest.fn();
    const stop = registerReadOperationReactionHook(spy);

    const obj = store({ foo: 1 });

    watch(() => {
      obj.foo;
    });

    expect(spy).toBeCalledTimes(0);

    stop();
  });
});
