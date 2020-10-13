import React from 'react';
import { store, useView } from '../lib';
import { actSync, expectContent, itRenders, render, wait } from './utils';

describe('useObserve', () => {
  itRenders('rerenders on update', () => {
    const obj = store({ foo: 1 });
    function Test() {
      useView();
      return <>{obj.foo}</>;
    }

    const t = render(<Test />);

    expectContent(t, '1');

    actSync(() => {
      obj.foo = 2;
    });

    expectContent(t, '2');
  });

  itRenders('dont rerender on unwatched update', () => {
    const obj = store({ foo: 1, bar: 2 });
    const renderSpy = jest.fn();
    function Test() {
      useView();
      renderSpy();
      return <>{obj.foo}</>;
    }

    const t = render(<Test />);

    expectContent(t, '1');

    actSync(() => {
      obj.bar++;
    });

    expectContent(t, '1');
    expect(renderSpy).toBeCalledTimes(1);
  });

  itRenders('rerenders once on multiple updates', () => {
    const obj = store({ foo: 1, bar: 1 });
    const renderSpy = jest.fn();
    function Test() {
      useView();
      renderSpy();
      return (
        <>
          {obj.foo}
          {obj.bar}
        </>
      );
    }

    const t = render(<Test />);

    expectContent(t, ['1', '1']);

    actSync(() => {
      obj.foo++;
      obj.bar++;
    });

    expectContent(t, ['2', '2']);
    expect(renderSpy).toBeCalledTimes(2);
  });

  itRenders(
    'rerenders once per async call parts on multiple updates',
    async () => {
      const obj = store({ foo: 1, bar: 1 });
      const renderSpy = jest.fn();
      function Test() {
        useView();
        renderSpy();
        return (
          <>
            {obj.foo}
            {obj.bar}
          </>
        );
      }

      async function update() {
        actSync(() => {
          obj.foo++;
          obj.bar++;
        });

        await wait(5);

        actSync(() => {
          obj.foo++;
          obj.bar++;
        });
      }

      const t = render(<Test />);

      expectContent(t, ['1', '1']);

      await update();

      expectContent(t, ['3', '3']);
      expect(renderSpy).toBeCalledTimes(3);
    },
  );

  itRenders('does not re-render parent on child update', () => {
    const obj = store({ foo: 1, bar: 2 });
    const parentSpy = jest.fn();
    const childSpy = jest.fn();
    function Test() {
      useView();
      parentSpy();
      return (
        <>
          {obj.foo}
          <Child />
        </>
      );
    }

    function Child() {
      childSpy();
      useView();
      return <>{obj.bar}</>;
    }

    const t = render(<Test />);

    expectContent(t, ['1', '2']);
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(1);

    actSync(() => {
      obj.bar = 3;
    });

    expectContent(t, ['1', '3']);
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(2);
  });
});
