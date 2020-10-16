import React, { Suspense } from 'react';
import { selector, store } from 'statek';
import { useView, view } from '@statek/react';
import {
  actSync,
  expectContent,
  itRenders,
  render,
  wait,
  manualPromise,
} from './utils';

describe('async selectors', () => {
  itRenders('properly suspends with async selector', () => {
    const [promise, resolve] = manualPromise<string>();
    const sel = selector(() => promise);
    const spy = jest.fn();

    const Test = view(() => {
      spy();
      return <>{sel()}</>;
    });

    const t = render(
      <Suspense fallback="Loading...">
        <Test />
      </Suspense>,
    );

    expectContent(t, 'Loading...');

    actSync(() => {
      resolve('foo');
    });

    expectContent(t, 'foo');
    expect(spy).toBeCalledTimes(2);
  });
});
