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

describe('selectors', () => {
  itRenders('re-renders when selected value change', () => {
    const s = store({ foo: 1 });
    const sel = selector(() => s.foo);

    const Test = view(() => {
      return <>{sel()}</>;
    });

    const t = render(<Test />);

    expectContent(t, '1');

    actSync(() => {
      s.foo++;
    });

    expectContent(t, '2');
  });

  itRenders('doesnt call same selector twice', () => {
    const s = store({ foo: 1, bar: 1 });
    const spy = jest.fn();
    const sel = selector(() => {
      spy();
      return s.foo;
    });

    const Test = view(() => {
      return (
        <>
          {sel()}
          {s.bar}
        </>
      );
    });

    const t = render(<Test />);

    expectContent(t, ['1', '1']);

    actSync(() => {
      s.bar++;
    });

    expect(spy).toBeCalledTimes(1);

    expectContent(t, ['1', '2']);

    expect(spy).toBeCalledTimes(1);
  });
});
