import React from 'react';
import { store, useUpdateOnStoreChanges } from '../lib';
import { actSync, itRenders } from './utils';

describe('useUpdateOnChanges', () => {
  itRenders(
    'rerenders on update that is not used during the render',
    ({ render, expectContent }) => {
      const obj = store({ foo: 1 });
      const spy = jest.fn();
      function Test() {
        useUpdateOnStoreChanges(() => obj);
        spy();
        return <>1</>;
      }

      render(<Test />);

      expect(spy).toBeCalledTimes(1);
      expectContent('1');

      actSync(() => {
        obj.foo++;
      });

      expect(spy).toBeCalledTimes(2);

      actSync(() => {
        obj.foo++;
      });

      expect(spy).toBeCalledTimes(3);
    },
  );
});
