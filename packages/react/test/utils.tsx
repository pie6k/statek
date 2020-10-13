import { sync, syncEvery, waitForSchedulersToFlush } from '@statek/core';
import { ReactElement, ReactNode } from 'react';
import ReactTestRenderer, { act, create } from 'react-test-renderer';

type ReactionModule = typeof import('@statek/core/lib/reaction');

// const aaa = ;

// console.log({ aaa });

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

interface RenderTestUtils {
  expectContent(content: any): void;
  asyncExpectContent(content: any): void;
  render(node: ReactNode): void;
}

export function actSync(callback: () => void) {
  act(() => {
    sync(() => {
      callback();
    });
  });
}

export function render(node: ReactElement) {
  return ReactTestRenderer.create(node);
}

export function itRenders(description: string, callback: () => any) {
  it(description, () => {
    // console.log('a');
    // sync(() => {
    sync(() => {
      callback();
    });
    // });
    // console.log('b');
  });
}

export function expectContent(
  r: ReactTestRenderer.ReactTestRenderer,
  content: any,
) {
  expect(r.toJSON()).toEqual(content);
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
