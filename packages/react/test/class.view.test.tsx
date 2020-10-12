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

describe('view - class', () => {
  it('rerenders on update', async () => {
    const obj = createStore({ foo: 1 });
    class Test extends Component {
      render() {
        return <>{obj.foo}</>;
      }
    }

    const RTest = view(Test);

    const t = ReactTestRenderer.create(<RTest />);

    await expectContentAfterUpdate(t, '1');

    obj.foo = 2;

    await expectContentAfterUpdate(t, '2');
  });

  it('supports props', async () => {
    const obj = createStore({ foo: 1 });
    class Test extends Component<{ bar: string }> {
      render() {
        return (
          <>
            {obj.foo}
            {this.props.bar}
          </>
        );
      }
    }

    const RTest = view(Test);

    const t = ReactTestRenderer.create(<RTest bar="bar" />);

    await expectContentAfterUpdate(t, ['1', 'bar']);

    obj.foo = 2;

    await expectContentAfterUpdate(t, ['2', 'bar']);
  });

  it('lifecycles are properly passed', async () => {
    const obj = createStore({ foo: 1 });
    const componentDidUpdateSpy = jest.fn();
    const componentDidMountSpy = jest.fn();
    const shouldComponentUpdateSpy = jest.fn();
    const componentWillUnmountSpy = jest.fn();
    const getSnapshotBeforeUpdateSpy = jest.fn();

    interface Props {
      p: number;
    }
    interface State {
      s: number;
    }

    const state: State = {
      s: 0,
    };

    class Test extends Component<Props, State> {
      state = state;

      componentDidUpdate(...args: any) {
        componentDidUpdateSpy(this, args);
      }

      componentDidMount(...args: any) {
        componentDidMountSpy(this, args);
      }

      shouldComponentUpdate(...args: any) {
        return shouldComponentUpdateSpy(args) ?? true;
      }

      componentWillUnmount(...args: any) {
        return componentWillUnmountSpy(this, args);
      }

      getSnapshotBeforeUpdate(...args: any) {
        return getSnapshotBeforeUpdateSpy(this, args) ?? null;
      }

      render() {
        return (
          <>
            {obj.foo}
            {this.props.p}
            {this.state.s}
          </>
        );
      }
    }

    const RTest = view(Test);

    const t = ReactTestRenderer.create(<RTest p={1} />);

    expect(componentDidMountSpy).toHaveBeenNthCalledWith(
      1,
      t.getInstance(),
      [],
    );

    await expectContentAfterUpdate(t, ['1', '1', '0']);

    obj.foo = 2;

    await expectContentAfterUpdate(t, ['2', '1', '0']);

    expect(componentDidUpdateSpy).toBeCalledTimes(1);

    t.update(<RTest p={2} />);

    expect(shouldComponentUpdateSpy).toHaveBeenLastCalledWith([
      t.getInstance()?.props,
      state,
      {},
    ]);
  });
});
