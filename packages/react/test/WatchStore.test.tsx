import { sync } from '@statek/core';
import React from 'react';
import { act } from 'react-test-renderer';
import { store, WatchStore } from '../lib';
import { itRenders } from './utils';

describe('WatchStore', () => {
  itRenders(
    'WatchStore updates on changes used by children',
    ({ render, expectContent }) => {
      const obj = store({ foo: 1 });
      function Test() {
        return (
          <WatchStore stores={() => obj}>
            <Nested />
          </WatchStore>
        );
      }

      function Nested() {
        nestedSpy();
        return <>{obj.foo}</>;
      }

      const nestedSpy = jest.fn();

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
});
