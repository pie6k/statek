const didWarnSet = new Set<any>();

export function warnOnce(pointer: any, ...args: any[]) {
  if (didWarnSet.has(pointer)) {
    return;
  }

  didWarnSet.add(pointer);

  console.warn(...args);
}
