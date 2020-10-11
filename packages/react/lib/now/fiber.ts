import { render } from 'react-dom';
import React, { Component, useEffect, useMemo, useState } from 'react';

interface SimpleRef<T = any> {
  current: T;
}

interface Internals {
  ReactCurrentOwner: SimpleRef<Fiber | null>;
}

export interface Fiber {}

// @ts-ignore;
const internals = React[
  '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
] as Internals;

export function getCurrentFiber() {
  return internals.ReactCurrentOwner.current;
}

export function isAnyComponentRendering() {
  return !!getCurrentFiber();
}
