import { render } from 'react-dom';
import React, { Component } from 'react';

type ClassFiber = any;

export function createForceUpdateByFiber() {
  /**
   * To pick force update, we need to render class component and
   * get force update from it's internals
   */

  let forceUpdate: ((fiber: ClassFiber) => void) | null = null;
  class CaptureForceUpdate extends Component {
    render() {
      /**
       * Each class component has such option that allows passing
       * instance of component to perform ForceUpdate firber update
       */
      // @ts-ignore
      forceUpdate = this.updater.enqueueForceUpdate;
      return null;
    }
  }

  // let's render
  const holder = document.createElement('div');

  render(<CaptureForceUpdate />, holder);

  // now we have this force update function picked

  // let's prepare function that accepts fiber instance
  function performForceUpdateByFiber(fiber: ClassFiber) {
    /**
     * enqueueForceUpdate requires instance to be passed,
     * but instance is only used to get corresponding fiber.
     *
     * Under the hood it expects fiber to be under ._reactInternalFiber
     * key. So let's prepare such object
     */

    forceUpdate!({ _reactInternalFiber: fiber });
  }

  return performForceUpdateByFiber;
}
