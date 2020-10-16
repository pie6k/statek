import { sync, store } from 'statek';
import { useView, view } from '@statek/react';
import React from 'react';
import { act } from 'react-test-renderer';
import { expectContent, itRenders, render } from './utils';

describe('sync', () => {
  itRenders('rerenders on update instantly when change is sync', () => {
    const obj = store({ foo: 1 });
    const Test = view(() => {
      return <>{obj.foo}</>;
    });

    const t = render(<Test />);

    expectContent(t, '1');

    act(() => {
      sync(() => {
        obj.foo = 2;
      });
    });

    expectContent(t, '2');
  });

  itRenders('sync is batched', () => {
    const obj = store({ foo: 1, bar: 1 });
    const spy = jest.fn();
    const Test = view(() => {
      spy();
      return (
        <>
          {obj.foo}
          {obj.bar}
        </>
      );
    });

    const t = render(<Test />);

    expect(spy).toBeCalledTimes(1);

    act(() => {
      sync(() => {
        obj.foo++;
        obj.bar++;
      });
    });

    expect(spy).toBeCalledTimes(2);
  });
});
