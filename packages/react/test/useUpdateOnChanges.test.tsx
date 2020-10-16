import React from 'react';
import { useWatchSelected } from '@statek/react';
import { store } from 'statek';
import { actSync, expectContent, itRenders, render } from './utils';

describe('useUpdateOnChanges', () => {
  itRenders('rerenders on update that is not used during the render', () => {
    const obj = store({ foo: 1 });
    const spy = jest.fn();
    function Test() {
      useWatchSelected(() => obj);
      spy();
      return <>1</>;
    }

    const t = render(<Test />);

    expect(spy).toBeCalledTimes(1);
    expectContent(t, '1');

    actSync(() => {
      obj.foo++;
    });

    expect(spy).toBeCalledTimes(2);

    actSync(() => {
      obj.foo++;
    });

    expect(spy).toBeCalledTimes(3);
  });
});
