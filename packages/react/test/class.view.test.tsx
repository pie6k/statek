import React, { Component } from 'react';
import { store } from 'statek';
import { view } from '@statek/react';
import { awaitAct, expectContent, itRenders, render } from './utils';

describe('view - class', () => {
  it('rerenders on update', async () => {
    const obj = store({ foo: 1 });
    class Test extends Component {
      render() {
        return <>{obj.foo}</>;
      }
    }

    const RTest = view(Test);

    const t = render(<RTest />);

    expectContent(t, '1');

    await awaitAct(() => {
      obj.foo = 2;
    });

    expectContent(t, '2');
  });

  it('supports props', async () => {
    const obj = store({ foo: 1 });
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

    const t = render(<RTest bar="bar" />);

    expectContent(t, ['1', 'bar']);

    await awaitAct(() => {
      obj.foo = 2;
    });

    expectContent(t, ['2', 'bar']);
  });

  it('lifecycles are properly passed', async () => {
    const obj = store({ foo: 1 });
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

    const t = render(<RTest p={1} />);

    expect(componentDidMountSpy).toHaveBeenNthCalledWith(
      1,
      t.getInstance(),
      [],
    );

    expectContent(t, ['1', '1', '0']);

    await awaitAct(() => {
      obj.foo = 2;
    });

    expectContent(t, ['2', '1', '0']);

    expect(componentDidUpdateSpy).toBeCalledTimes(1);

    t.update(<RTest p={2} />);

    expect(shouldComponentUpdateSpy).toHaveBeenLastCalledWith([
      t.getInstance()?.props,
      state,
      {},
    ]);
  });
});
