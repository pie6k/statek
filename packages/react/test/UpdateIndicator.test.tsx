import { view } from '@statek/react';
import { expectContent, render, repeatingPromise } from '@statek/testutils';
import React, { Suspense } from 'react';
import { selector, store } from 'statek';
import { awaitAct } from './utils';

// view;

describe('UpdateIndicator', () => {
  it('properly suspends with async selector', async () => {
    const nameVal = repeatingPromise<string>();
    const s = store({ i: 0 });
    const sel = selector(async () => {
      const val = await nameVal.promise;
      return `${val} ${s.i}`;
    });

    const spy = jest.fn();

    const Test = view(function Test2() {
      spy();
      return (
        <>
          {sel.value}
          <Test.UpdateIndicator indicator="Updating..." />
        </>
      );
    });

    const t = render(
      <Suspense fallback="Loading...">
        <Test />
      </Suspense>,
    );

    expectContent(t, 'Loading...');

    await nameVal.resolve('foo');

    expectContent(t, 'foo 0');

    nameVal.reset();

    await awaitAct(() => s.i++);

    expectContent(t, ['foo 0', 'Updating...']);

    await nameVal.resolve('bar');

    expectContent(t, 'bar 1');
  });
});
