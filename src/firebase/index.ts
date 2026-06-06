// src/firebase/index.ts — barrel export
export { fbAuth, fbFirestore, fbStorage, COLLECTIONS, STORAGE_PATHS, FIREBASE_CONFIG } from './config';
export * as FireAuth    from './auth';
export * as FireStore   from './firestore';
export * as FireStorage from './storage';
export * as FireMsg     from './messaging';
