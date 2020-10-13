import { sync } from '@statek/core';
import React from 'react';
import { act } from 'react-test-renderer';
import { store, useView } from '../lib';
import { expectContent, itRenders, render } from './utils';

describe('sync', () => {
  itRenders('rerenders on update instantly when change is sync', () => {
    const obj = store({ foo: 1 });
    function Test() {
      useView();
      return <>{obj.foo}</>;
    }

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
    function Test() {
      useView();
      spy();
      return (
        <>
          {obj.foo}
          {obj.bar}
        </>
      );
    }

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
