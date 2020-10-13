import { sync } from '@statek/core';
import React from 'react';
import { act } from 'react-test-renderer';
import { store, useView } from '../lib';
import { itRendersRaw } from './utils';

describe('sync', () => {
  itRendersRaw(
    'rerenders on update instantly when change is sync',
    ({ render, expectContent }) => {
      const obj = store({ foo: 1 });
      function Test() {
        useView();
        return <>{obj.foo}</>;
      }

      render(<Test />);

      expectContent('1');

      act(() => {
        sync(() => {
          obj.foo = 2;
        });
      });

      expectContent('2');
    },
  );

  itRendersRaw('sync is batched', ({ render }) => {
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

    render(<Test />);

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
