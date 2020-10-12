import {
  isObservable,
  observable,
  watch,
  getObservableRaw,
} from '@statek/core/lib';
import { watchEager } from '../lib/watch';

describe('watchEager', () => {
  it('will eager watch even unobserved props', () => {
    const obj = observable({
      a: 1,
      b: {
        c: 2,
      },
      d: [1],
      e: {
        f: [1],
      },
      g: {
        h: new Set<number>(),
        i: new Map<any, any>(),
        k: new Map<any, any>([[1, { foo: 2 }]]),
      },
      h: null,
      i: NaN,
      k: () => {},
      l: new Uint32Array(2),
    });

    const spy = jest.fn(() => {});

    const stop = watchEager(spy, obj);

    obj.a++;
    expect(spy).toBeCalledTimes(2);
    obj.b.c++;
    expect(spy).toBeCalledTimes(3);
    obj.d.push(2);
    expect(spy).toBeCalledTimes(4);
    obj.e.f.push(2);
    expect(spy).toBeCalledTimes(5);
    obj.g.h.add(1);
    expect(spy).toBeCalledTimes(6);
    obj.g.i.set(1, 2);
    expect(spy).toBeCalledTimes(7);
    obj.g.k.get(1).foo = 3;
    expect(spy).toBeCalledTimes(8);
    obj.l[2] = 30;
    expect(spy).toBeCalledTimes(9);

    stop();

    obj.a++;

    expect(spy).toBeCalledTimes(9);
  });
});
