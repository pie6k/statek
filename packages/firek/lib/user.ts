import { selector, store, dontWatch } from 'statek';

import { getAdapter } from './adapter';

const initialUser = getAdapter().auth().currentUser;

if (initialUser) {
  dontWatch(initialUser);
}

const currentUserStore = store({
  user: initialUser,
});

getAdapter()
  .auth()
  .onAuthStateChanged(user => {
    if (!user) {
      currentUserStore.user = null;
      return;
    }

    dontWatch(user);

    currentUserStore.user = user;
  });

export function currentUser() {
  return currentUserStore.user;
}
