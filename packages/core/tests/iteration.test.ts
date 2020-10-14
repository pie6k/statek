import { isStore, lazyWatch, store, watch } from '../lib';
import { _countReadOperations } from '../lib/operations';

describe('iteration', () => {
  it('registers only one iterate read reaction on iterations', () => {
    const s = store({ foo: [{ bar: 1 }, { bar: 1 }, { bar: 1 }] });

    let getCount = _countReadOperations();

    const call = lazyWatch((deep: boolean) => {
      s.foo.map(i => {
        if (deep) {
          i.bar;
        }
      });
    });

    call(false);

    expect(getCount()).toBe(2);

    call(true);

    expect(getCount()).toBe(7);
  });

  it('array iteration should return observables', () => {
    const s = store({ foo: [{ bar: 1 }, { bar: 1 }] });

    let dummy: any;
    watch(() => {
      s.foo.forEach(item => {
        dummy = item;
      });
    });

    expect(isStore(dummy)).toBe(true);
  });
});
