import type { app, firestore, auth } from 'firebase';

type App = typeof app;

type Firestore = typeof firestore;

type Auth = typeof auth;

interface FirebaseAdapter {
  app: App;
  firestore: Firestore;
  auth: Auth;
}

let adapter: FirebaseAdapter;

export function setFirebaseAdapter(adapterToSet: FirebaseAdapter) {
  if (adapter) {
    throw new Error('Cannot set firebase adapter twice');
  }

  adapter = adapterToSet;
}

export function getAdapter() {
  if (!adapter) {
    throw new Error('No adapter is set');
  }

  return adapter;
}
