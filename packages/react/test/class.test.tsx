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
});
