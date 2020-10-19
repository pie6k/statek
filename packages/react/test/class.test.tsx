import React, { Component } from 'react';
import { store } from 'statek';
import { awaitAct, expectContent, itRenders, render } from './utils';

describe('class without view', () => {
  it.skip('rerenders on update', async () => {
    const obj = store({ foo: 1 });
    class Test extends Component {
      render() {
        return <>{obj.foo}</>;
      }
    }

    const t = render(<Test />);

    expectContent(t, '1');

    await awaitAct(() => {
      obj.foo = 2;
    });

    expectContent(t, '2');
  });
});
