import React, { Suspense } from 'react';
import { selector, store, waitForSchedulersToFlush } from 'statek';
import { useView, view } from '@statek/react';
import {
  awaitAct,
  expectContent,
  itRenders,
  render,
  wait,
  manualPromise,
} from './utils';

describe('selectors', () => {
  it('re-renders when selected value change', async () => {
    const s = store({ foo: 1 });
    const sel = selector(() => s.foo);

    const Test = view(() => {
      return <>{sel.value}</>;
    });

    const t = render(<Test />);

    expectContent(t, '1');

    // await waitForSchedulersToFlush();

    await awaitAct(() => {
      s.foo++;
    });

    // await waitForSchedulersToFlush();

    expectContent(t, '2');
  });

  it('doesnt call same selector twice', async () => {
    const s = store({ foo: 1, bar: 1 });
    const spy = jest.fn();
    const sel = selector(() => {
      spy();
      return s.foo;
    });

    const Test = view(() => {
      return (
        <>
          {sel.value}
          {s.bar}
        </>
      );
    });

    const t = render(<Test />);

    expectContent(t, ['1', '1']);

    await awaitAct(() => {
      s.bar++;
    });

    expect(spy).toBeCalledTimes(1);

    expectContent(t, ['1', '2']);

    expect(spy).toBeCalledTimes(1);
  });
});
