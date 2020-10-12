import { render } from 'react-dom';
import React, { Component } from 'react';

type ClassFiber = any;

export function createForceUpdateByFiber() {
  /**
   * To pick force update, we need to render class component and
   * get force update from it's internals
   */

  let forceUpdate: ((fiber: ClassFiber) => void) | null = null;

  function captureForceUpdate(fiber: ClassFiber) {
    forceUpdate = (fiber: ClassFiber) => {
      fiber.stateNode.updater.enqueueForceUpdate({
        _reactInternalFiber: fiber,
      });
    };
  }

  // now we have this force update function picked

  // let's prepare function that accepts fiber instance
  function performForceUpdateByClassFiber(fiber: ClassFiber) {
    if (!forceUpdate) {
      captureForceUpdate(fiber);
    }

    forceUpdate!(fiber);
    /**
     * enqueueForceUpdate requires instance to be passed,
     * but instance is only used to get corresponding fiber.
     *
     * Under the hood it expects fiber to be under ._reactInternalFiber
     * key. So let's prepare such object
     */
    // forceUpdate!({ _reactInternalFiber: fiber });
  }

  return performForceUpdateByClassFiber;
}

export const updateClassComponentByFiber = createForceUpdateByFiber();
