export type SelectorCallback<T> = (value: T) => void;

export interface Selector<T> {
  readonly value: T;
  readonly promise: Promise<T>;
}

export type UpdateStrategy = 'silent' | 'reset';

export interface SelectorOptions {
  name?: string;
  lazy?: boolean;
  updateStrategy?: UpdateStrategy;
}
