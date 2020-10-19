import { ReactionCallback, subscribeToReactionStopped } from '../reaction';
import { manyToMany } from '../utils';
import { Selector } from './types';

const reactionsToSelectors = manyToMany<
  ReactionCallback,
  Selector<any>
>().create('reactions', 'selectors');

const selectorsUsedByReaction = new WeakMap<
  ReactionCallback,
  Set<Selector<any>>
>();

const reactionsWatchingSelector = new WeakMap<
  Selector<any>,
  Set<ReactionCallback>
>();

const selectorNotWatchedAnymoreListeners = new WeakMap<
  Selector<any>,
  Set<() => void>
>();

export function registerReactionUsedSelector(
  reaction: ReactionCallback,
  selector: Selector<any>,
) {
  let otherSelectors = selectorsUsedByReaction.get(reaction);
  let usedInReactions = reactionsWatchingSelector.get(selector);

  if (!otherSelectors) {
    otherSelectors = new Set();
    selectorsUsedByReaction.set(reaction, otherSelectors);
  }

  if (!usedInReactions) {
    usedInReactions = new Set();
    reactionsWatchingSelector.set(selector, usedInReactions);
  }

  usedInReactions.add(reaction);
  otherSelectors.add(selector);
}

export function clearReactionUsedSelectors(reaction: ReactionCallback) {
  const usedSelectors = selectorsUsedByReaction.get(reaction);

  if (!usedSelectors) {
    throw 'todo';
  }

  usedSelectors.forEach(usedSelector => {
    const reactionsOfSelector = reactionsWatchingSelector.get(usedSelector);

    if (!reactionsOfSelector) {
      throw new Error('No reactions for selector - incorrect state');
    }

    reactionsOfSelector.delete(reaction);
    usedSelectors.delete(usedSelector);
  });
}

export function getSelectorsUsedByReaction(reaction: ReactionCallback) {
  return selectorsUsedByReaction.get(reaction) ?? null;
}

function handleWatchForReactionStopped(
  reaction: ReactionCallback,
  selector: Selector<any>,
) {
  return subscribeToReactionStopped(reaction, () => {
    clearReactionUsedSelectors(reaction);

    const stillWatchingSelectors = reactionsWatchingSelector.get(selector);

    if (!stillWatchingSelectors) {
      throw new Error('incorrect state 24');
    }

    if (stillWatchingSelectors.size > 0) {
      return;
    }

    const notWatchedAnymoreListeners = selectorNotWatchedAnymoreListeners.get(
      selector,
    );

    if (!notWatchedAnymoreListeners) {
      return;
    }

    notWatchedAnymoreListeners.forEach(listener => {
      listener();
    });
  });
}

export function onSelectorNotWatchedAnymore(
  selector: Selector<any>,
  callback: () => void,
) {
  let currentListeners = selectorNotWatchedAnymoreListeners.get(selector);

  if (!currentListeners) {
    currentListeners = new Set();
    selectorNotWatchedAnymoreListeners.set(selector, currentListeners);
  }

  currentListeners.add(callback);

  return function stop() {
    currentListeners!.delete(callback);
  };
}
