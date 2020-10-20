import { view } from '@statek/react';
import React from 'react';
import { store } from 'statek';
import { awaitAct, expectContent, render, wait } from './utils';

describe.only('view', () => {
  it('rerenders on update', async () => {
    const obj = store({ foo: 1 });
    const Test = view(() => {
      return <>{obj.foo}</>;
    });

    const t = render(<Test />);

    expectContent(t, '1');

    await awaitAct(() => {
      obj.foo = 2;
    });

    expectContent(t, '2');
  });

  it('dont rerender on unwatched update', async () => {
    const obj = store({ foo: 1, bar: 2 });
    const renderSpy = jest.fn();
    const Test = view(() => {
      renderSpy();
      return <>{obj.foo}</>;
    });

    const t = render(<Test />);

    expectContent(t, '1');

    await awaitAct(() => {
      obj.bar++;
      obj.bar++;
    });

    expectContent(t, '1');
    expect(renderSpy).toBeCalledTimes(1);
  });

  it('rerenders once on multiple updates', async () => {
    const obj = store({ foo: 1, bar: 1 });
    const renderSpy = jest.fn();
    const Test = view(() => {
      renderSpy();
      return (
        <>
          {obj.foo}
          {obj.bar}
        </>
      );
    });

    const t = render(<Test />);

    expectContent(t, ['1', '1']);

    await awaitAct(() => {
      obj.foo++;
      obj.bar++;
    });

    expectContent(t, ['2', '2']);
    expect(renderSpy).toBeCalledTimes(2);
  });

  it('rerenders once per async call parts on multiple updates', async () => {
    const obj = store({ foo: 1, bar: 1 });
    const renderSpy = jest.fn();
    const Test = view(() => {
      renderSpy();
      return (
        <>
          {obj.foo}
          {obj.bar}
        </>
      );
    });

    async function update() {
      await awaitAct(() => {
        obj.foo++;
        obj.bar++;
      });
      await wait(5);

      await awaitAct(() => {
        obj.foo++;
        obj.bar++;
      });
    }

    const t = render(<Test />);

    expectContent(t, ['1', '1']);

    await update();

    expectContent(t, ['3', '3']);
    expect(renderSpy).toBeCalledTimes(3);
  });

  it('does not re-render parent on child update', async () => {
    const obj = store({ foo: 1, bar: 2 });
    const parentSpy = jest.fn();
    const childSpy = jest.fn();
    const Test = view(() => {
      parentSpy();
      return (
        <>
          {obj.foo}
          <Child />
        </>
      );
    });

    const Child = view(() => {
      childSpy();
      return <>{obj.bar}</>;
    });

    const t = render(<Test />);

    expectContent(t, ['1', '2']);
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(1);

    await awaitAct(() => {
      obj.bar = 3;
    });

    expectContent(t, ['1', '3']);
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(2);
  });
});
