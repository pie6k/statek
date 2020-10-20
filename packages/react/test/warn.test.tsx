import React from 'react';
import { store } from 'statek';
import '@statek/react';
import { render, watchWarn } from './utils';

describe('warn', () => {
  it('should warn when accessing store inside non-reactive component', () => {
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
  });

  it('should warn about Unknown if not able to get component name', () => {
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
  });
});
