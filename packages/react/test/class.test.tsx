import React, { Component } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { waitForSchedulersToFlush } from '@statek/core';
import { createStore, useObserve, view } from '../lib';
import { wait } from './utils';

async function expectContentAfterUpdate(
  renderer: ReactTestRenderer.ReactTestRenderer,
  content: any,
) {
  await waitForSchedulersToFlush();

  expect(renderer.toJSON()).toEqual(content);
}

describe('view', () => {
  it('rerenders on update', async () => {
    const obj = createStore({ foo: 1 });
    class Test extends Component {
      render() {
        return <>{obj.foo}</>;
      }
    }

    const t = ReactTestRenderer.create(<Test />);

    await expectContentAfterUpdate(t, '1');

    obj.foo = 2;

    await expectContentAfterUpdate(t, '2');
  });

  it('dont rerender on unwatched update', async () => {
    const obj = createStore({ foo: 1, bar: 2 });
    const renderSpy = jest.fn();
    const Test = view(() => {
      renderSpy();
      return <>{obj.foo}</>;
    });

    const t = ReactTestRenderer.create(<Test />);

    await expectContentAfterUpdate(t, '1');

    obj.bar++;

    await expectContentAfterUpdate(t, '1');
    expect(renderSpy).toBeCalledTimes(1);
  });

  it('rerenders once on multiple updates', async () => {
    const obj = createStore({ foo: 1, bar: 1 });
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

    const t = ReactTestRenderer.create(<Test />);

    await expectContentAfterUpdate(t, ['1', '1']);

    obj.foo++;
    obj.bar++;

    await expectContentAfterUpdate(t, ['2', '2']);
    expect(renderSpy).toBeCalledTimes(2);
  });

  it('rerenders once per async call parts on multiple updates', async () => {
    const obj = createStore({ foo: 1, bar: 1 });
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
      obj.foo++;
      obj.bar++;
      await wait(5);
      obj.foo++;
      obj.bar++;
    }

    const t = ReactTestRenderer.create(<Test />);

    await expectContentAfterUpdate(t, ['1', '1']);

    await update();

    await expectContentAfterUpdate(t, ['3', '3']);
    expect(renderSpy).toBeCalledTimes(3);
  });

  it('does not re-render parent on child update', async () => {
    const obj = createStore({ foo: 1, bar: 2 });
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

    const t = ReactTestRenderer.create(<Test />);

    await expectContentAfterUpdate(t, ['1', '2']);
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(1);

    obj.bar = 3;

    await expectContentAfterUpdate(t, ['1', '3']);
    expect(parentSpy).toBeCalledTimes(1);
    expect(childSpy).toBeCalledTimes(2);
  });
});
