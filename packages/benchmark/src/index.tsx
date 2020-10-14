import { render } from 'react-dom';
import React, { Component, useEffect, useMemo, useState } from 'react';

// @ts-ignore;
const internals = React[
  '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
] as any;

function getFiber() {
  return internals.ReactCurrentOwner.current;
}

function saveFiber() {
  const fiber = getFiber();

  if (!window.a.has(fiber)) {
  }

  window.a.add(fiber);
}

declare global {
  var a: Set<any>;
}

window.a = new Set();

function App() {
  const [, set] = useState({});

  const [, set2] = useState({});
  useMemo(() => {
    saveFiber();
  }, []);
  saveFiber();

  return (
    <div onClick={() => set({})}>
      {[1, 2, 3].map(a => {
        saveFiber();
        return <div key={a}>{a}</div>;
      })}
      <button
        onClick={() => {
          set2({});
        }}
      >
        foo
      </button>
    </div>
  );
}

class App2 extends Component {
  render() {
    debugger;
    return <div>elo</div>;
  }
}

render(<App />, document.getElementById('app')!);
