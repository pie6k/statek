import { sync, store } from 'statek';
import React from 'react';
import { act } from 'react-test-renderer';
import { WatchStore } from '@statek/react';
import { expectContent, itRenders, render } from './utils';

describe('WatchStore', () => {
  it('WatchStore updates on changes used by children', () => {
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

    const t = render(<Test />);

    expectContent(t, '1');

    act(() => {
      sync(() => {
        obj.foo = 2;
      });
    });

    expectContent(t, '2');
  });
});
