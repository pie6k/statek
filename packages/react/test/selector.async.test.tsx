import React, { Suspense } from 'react';
import {
  selector,
  store,
  waitForSchedulersToFlush,
  allowInternal,
} from 'statek';
import { useView, view } from '@statek/react';
import {
  actSync,
  expectContent,
  itRenders,
  render,
  wait,
  watchWarn,
  manualPromise,
  waitNextTick,
} from '@statek/testutils';

import { act, create } from 'react-test-renderer';

// view;

describe('async selectors', () => {
  it('properly suspends with async selector', async () => {
    const [promise, resolve] = manualPromise<string>();
    const sel = selector(async () => {
      return await promise;
    });
    const spy = jest.fn();

    const Test = view(() => {
      spy();
      return <>{sel.value}</>;
    });

    const t = render(
      <Suspense fallback="Loading...">
        <Test />
      </Suspense>,
    );

    expectContent(t, 'Loading...');

    await resolve('foo');

    expectContent(t, 'foo');
    expect(spy).toBeCalledTimes(2);
  });
});
