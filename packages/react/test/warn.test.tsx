import React from 'react';
import { store } from 'statek';
import { itRenders, render, expectContent, watchWarn } from './utils';

describe('warn', () => {
  itRenders(
    'should warn when accessing store inside non-reactive component',
    () => {
      const obj = store({ foo: 1 });
      function Test() {
        return <>{obj.foo}</>;
      }

      const warn = watchWarn();

      render(<Test />);

      expect(warn.getLast()).toMatchInlineSnapshot(
        `"Accessing store property inside functional <Test /> component that is not reactive. Either use useView hook inside of it or render <Test /> inside <WatchStore /> provider."`,
      );

      warn.stop();
    },
  );

  itRenders(
    'should warn about Unknown if not able to get component name',
    () => {
      const obj = store({ foo: 1 });
      const Test = () => {
        return <>{obj.foo}</>;
      };

      const warn = watchWarn();

      render(<Test />);

      expect(warn.getLast()).toMatchInlineSnapshot(
        `"Accessing store property inside functional <Test /> component that is not reactive. Either use useView hook inside of it or render <Test /> inside <WatchStore /> provider."`,
      );

      warn.stop();
    },
  );
});
