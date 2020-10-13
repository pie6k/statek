import React from 'react';
import { store, useView } from '../lib';
import { actSync, itRenders, wait } from './utils';

describe('useObserve', () => {
  itRenders('rerenders on update', ({ expectContent, render }) => {
    const obj = store({ foo: 1 });
    function Test() {
      useView();
      return <>{obj.foo}</>;
    }

    render(<Test />);

    expectContent('1');

    actSync(() => {
      obj.foo = 2;
    });

    expectContent('2');
  });

  itRenders(
    'dont rerender on unwatched update',
    ({ expectContent, render }) => {
      const obj = store({ foo: 1, bar: 2 });
      const renderSpy = jest.fn();
      function Test() {
        useView();
        renderSpy();
        return <>{obj.foo}</>;
      }

      render(<Test />);

      expectContent('1');

      obj.bar++;

      expectContent('1');
      expect(renderSpy).toBeCalledTimes(1);
    },
  );

  itRenders(
    'rerenders once on multiple updates',
    ({ expectContent, render }) => {
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

      render(<Test />);

      expectContent(['1', '1']);

      actSync(() => {
        obj.foo++;
        obj.bar++;
      });

      expectContent(['2', '2']);
      expect(renderSpy).toBeCalledTimes(2);
    },
  );

  itRenders(
    'rerenders once per async call parts on multiple updates',
    async ({ asyncExpectContent, render }) => {
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
        obj.foo++;
        obj.bar++;

        await wait(5);

        obj.foo++;
        obj.bar++;
      }

      render(<Test />);

      await asyncExpectContent(['1', '1']);

      await update();

      await asyncExpectContent(['3', '3']);
      expect(renderSpy).toBeCalledTimes(3);
    },
  );

  itRenders(
    'does not re-render parent on child update',
    ({ expectContent, render }) => {
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

      render(<Test />);

      expectContent(['1', '2']);
      expect(parentSpy).toBeCalledTimes(1);
      expect(childSpy).toBeCalledTimes(1);

      actSync(() => {
        obj.bar = 3;
      });

      // await waitForSchedulersToFlush();

      expectContent(['1', '3']);
      expect(parentSpy).toBeCalledTimes(1);
      expect(childSpy).toBeCalledTimes(2);
    },
  );
});
