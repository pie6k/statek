import { sync, store } from 'statek';
import React from 'react';
import { act } from 'react-test-renderer';
import { WatchContext } from '@statek/react';
import { awaitAct, expectContent, itRenders, render } from './utils';

describe('WatchContext', () => {
  it('WatchContext updates on changes used by children', async () => {
    const obj = store({ foo: 1 });
    function Test() {
      return (
        <WatchContext stores={[obj]}>
          <Nested />
        </WatchContext>
      );
    }

    function Nested() {
      nestedSpy();
      return <>{obj.foo}</>;
    }

    const nestedSpy = jest.fn();

    const t = render(<Test />);

    expectContent(t, '1');

    await awaitAct(() => {
      obj.foo = 2;
    });

    expectContent(t, '2');
  });
});
