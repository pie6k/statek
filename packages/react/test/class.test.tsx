import React, { Component } from 'react';
import { store } from '../lib';
import { actSync, expectContent, itRenders, render } from './utils';

describe('class without view', () => {
  itRenders('rerenders on update', () => {
    const obj = store({ foo: 1 });
    class Test extends Component {
      render() {
        return <>{obj.foo}</>;
      }
    }

    const t = render(<Test />);

    expectContent(t, '1');

    actSync(() => {
      obj.foo = 2;
    });

    expectContent(t, '2');
  });
});
