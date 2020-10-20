const didWarnSet = new Set<any>();

export function warnOnce(pointer: any, ...args: any[]) {
  if (didWarnSet.has(pointer)) {
    return;
  }

  didWarnSet.add(pointer);

  console.warn(...args);
}

export function getComponentTypeNiceName(type: any) {
  if (!type) {
    return 'Unknown';
  }

  const foundName = type?.displayName || type?.name || 'Unknown';

  if (!foundName.trim()) {
    return 'Unknown';
  }

  return foundName;
}
