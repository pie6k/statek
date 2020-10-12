type ClassFiber = {
  // Fiber of Class Component has 'stateNode' prop which holds instance of Component Class.
  // As it extends `React.Component` - we'll be able to pick .forceUpdate method from it that
  // can be used to update any Class component knowing it's fiber.
  stateNode: any;
};

let capturedForceUpdateClassComponent:
  | ((fiber: ClassFiber) => void)
  | null = null;

/**
 * This will pick force update by fiber from any class instance fiber
 */
function captureForceUpdateFromFiber(fiber: ClassFiber) {
  capturedForceUpdateClassComponent = (fiber: ClassFiber) => {
    // StateNode in fiber represents instance of class component.
    // Such instance has updater.enqueueForceUpdate which expects { _reactInternalFiber: fiber }
    // to be provided. This is exactly what happens when you call .forceUpdate() on Class
    // Component directly.
    fiber.stateNode.updater.enqueueForceUpdate({
      _reactInternalFiber: fiber,
    });
  };
}

export function updateClassComponentByFiber(fiber: ClassFiber) {
  // When it's used for the first time - pick 'force update by fiber' method from class component
  // instance.
  if (!capturedForceUpdateClassComponent) {
    captureForceUpdateFromFiber(fiber);
  }

  // When we have this method - call it using provided fiber
  capturedForceUpdateClassComponent!(fiber);
}
