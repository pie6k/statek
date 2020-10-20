/**
 * @jest-environment jsdom
 */
import {
  InjectedReaction,
  addInjectReactionHook,
  registerReaction,
  store,
  watch,
} from 'statek/lib/';
import { allowInternal } from '../lib/internal';

describe('readOperationHook', () => {
  it('calls read operation if no reaction found', () => {
    const spy = jest.fn();
    const stop = allowInternal(() => addInjectReactionHook(spy));

    const obj = store({ foo: 1 });

    obj.foo;

    expect(spy).toBeCalledTimes(1);

    stop();
  });

  it('hook receives proper reference to target object', () => {
    const objRaw = { foo: 1 };

    let foundObj: any;
    const stop = allowInternal(() =>
      addInjectReactionHook(operation => {
        foundObj = operation.target;
        return null;
      }),
    );

    const obj = store(objRaw);

    obj.foo;

    expect(foundObj).toBe(objRaw);

    stop();
  });

  it('dont call hook if reaction is found', () => {
    const spy = jest.fn();
    const stop = allowInternal(() => addInjectReactionHook(spy));

    const obj = store({ foo: 1 });

    watch(() => {
      obj.foo;
    });

    expect(spy).toBeCalledTimes(0);

    stop();
  });

  it('throw if added hook returns callback that is not a reaction', () => {
    const spy = jest.fn((): InjectedReaction | null => {
      return {
        reaction: () => {},
        getIsStillRunning: () => true,
      };
    });
    const stop = allowInternal(() => addInjectReactionHook(spy));

    const obj = store({ foo: 1 });

    expect(() => {
      obj.foo;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Function returned from \`registerGetCurrentReactionHook\` is not a reaction. It needs to be wrapped in registerReaction first."`,
    );

    stop();
  });

  it('dont call hooked reaction if it marks itself as not running', () => {
    const cb = jest.fn();
    const r = allowInternal(() => registerReaction(cb, cb));

    const stop = allowInternal(() =>
      addInjectReactionHook(() => {
        return {
          reaction: r,
          getIsStillRunning() {
            return false;
          },
        };
      }),
    );

    const obj = store({ foo: 1 });

    obj.foo;

    expect(cb).toBeCalledTimes(0);

    stop();
  });
});
