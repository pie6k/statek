import React from 'react';
import { store } from '../lib';
import { itRendersRaw } from './utils';

describe('warn', () => {
  itRendersRaw(
    'should warn when accessing store inside non-reactive component',
    ({ render, expectContent }) => {
      const obj = store({ foo: 1 });
      function Test() {
        return <>{obj.foo}</>;
      }

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<Test />);

      expect(warnSpy.mock.calls[0][0]).toMatchInlineSnapshot(
        `"Accessing store property inside functional <Test /> component that is not reactive. Either use useView hook inside of it or render <Test /> inside <WatchStore /> provider."`,
      );

      warnSpy.mockRestore();
    },
  );
});
