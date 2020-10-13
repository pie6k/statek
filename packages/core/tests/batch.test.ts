/**
 * @jest-environment jsdom
 */
import { store, watch, getStoreRaw, lazyWatch, batch } from '@statek/core/lib';

describe('batch', () => {
  it('should call reaction once when called in batch', () => {
    const obj = store({ foo: 2, bar: 3 });
    const reaction = jest.fn(() => {
      obj.bar;
      obj.foo;
    });

    watch(reaction);
    expect(reaction).toBeCalledTimes(1);

    batch(() => {
      obj.foo = 10;
      obj.bar = 20;
    });

    expect(reaction).toBeCalledTimes(2);
  });

  it('supports nested batch', () => {
    const obj = store({ foo: 2, bar: 3, baz: 4 });
    const reaction = jest.fn(() => {
      obj.bar;
      obj.foo;
    });

    watch(reaction);
    expect(reaction).toBeCalledTimes(1);

    batch(() => {
      obj.foo = 10;
      batch(() => {
        obj.bar = 20;
        batch(() => {
          obj.baz = 30;
        });
      });
    });

    expect(reaction).toBeCalledTimes(2);
  });

  it('will throw errors in batch', () => {
    expect(() => {
      batch(() => {
        throw new Error('foo');
      });
    }).toThrowError('foo');
  });

  it('returns to normal mode after batch ends', () => {
    const obj = store({ foo: 2, bar: 3 });
    const reaction = jest.fn(() => {
      obj.bar;
      obj.foo;
    });

    watch(reaction);
    expect(reaction).toBeCalledTimes(1);

    obj.foo = 10;
    obj.bar = 10;

    expect(reaction).toBeCalledTimes(3);

    batch(() => {
      obj.foo = 20;
      obj.bar = 20;
    });

    expect(reaction).toBeCalledTimes(4);

    obj.foo = 30;
    obj.bar = 30;

    expect(reaction).toBeCalledTimes(6);
  });
});
