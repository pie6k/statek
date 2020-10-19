import { sync, syncEvery, waitForSchedulersToFlush } from '@statek/core';
import { ReactElement, ReactNode } from 'react';
import ReactTestRenderer, { act, create } from 'react-test-renderer';

type ReactionModule = typeof import('@statek/core/lib/reaction');

jest.mock(
  require.resolve('@statek/core/lib/reaction'),
  () => {
    const original: ReactionModule = require('@statek/core/lib/reaction');

    const originalApply = original.applyReaction;
    original.applyReaction = (...args: any) => {
      act(() => {
        originalApply(...(args as [any]));
      });
    };
  },
  {},
);

export function wait(time: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export async function awaitAct<R>(callback: () => R): Promise<R> {
  let result: R;
  await act(async () => {
    result = await callback();
    await wait(0);
  });

  return result!;
}

export function render(node: ReactElement) {
  return ReactTestRenderer.create(node);
}

export function itRenders(description: string, callback: () => any) {
  it(description, () => {
    sync(() => {
      callback();
    });
  });
}

export function expectContent(
  r: ReactTestRenderer.ReactTestRenderer,
  content: any,
) {
  expect(r.toJSON()).toEqual(content);
}

export function watchWarn() {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

  function getLastCall() {
    return warnSpy.mock.calls[warnSpy.mock.calls.length - 1];
  }

  function getLast(): string | null {
    return getLastCall()?.[0] ?? null;
  }

  function count() {
    return warnSpy.mock.calls.length;
  }

  function stop() {
    warnSpy.mockRestore();
  }

  return {
    getLast,
    stop,
    count,
  };
}

type Callback<T> = (value: T) => void;

export function manualPromise<T>() {
  const listeners = new Set<Callback<T>>();

  const promise = new Promise<T>(() => {});

  function then(callback: Callback<T>) {
    listeners.add(callback);
  }

  // @ts-ignore
  promise.then = then;

  function resolve(value: T) {
    listeners.forEach(listener => {
      listener(value);
    });
  }

  return [(promise as any) as Promise<T>, resolve] as const;
}

// export function buildUtils(): RenderTestUtils {
//   let currentRender: ReactTestRenderer.ReactTestRenderer;
//   function expectContent(content: any) {
//     expect(currentRender.toJSON()).toEqual(content);
//   }

//   function render(node: ReactElement) {
//     currentRender = ReactTestRenderer.create(node);
//   }

//   async function asyncExpectContent(content: any) {
//     await waitForSchedulersToFlush();
//     expectContent(content);
//   }

//   return { expectContent, render, asyncExpectContent };
// }
