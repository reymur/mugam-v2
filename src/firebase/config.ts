import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk',
  authDomain:        'mugam-club.firebaseapp.com',
  projectId:         'mugam-club',
  storageBucket:     'mugam-club.firebasestorage.app',
  messagingSenderId: '1034748814848',
  appId:             '1:1034748814848:web:4b2edc2575a211efbc9ae5',
};

let app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// initializeAuth only on FIRST init, getAuth on hot reload
let fbAuth;
try {
  fbAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  fbAuth = getAuth(app);
}

export { fbAuth };
export const fbFirestore = getFirestore(app);
export const fbStorage   = null as any;

export const COLLECTIONS = {
  USERS:         'users',
  MUSICIANS:     'musicians',
  GIGS:          'gigs',
  BOARD:         'board',
  MARKET:        'market',
  STORIES:       'stories',
  VIDEOS:        'videos',
  CHATS:         'chats',
  MESSAGES:      'messages',
  EVENTS:        'events',
  ROOMS:         'rooms',
  NOTIFICATIONS: 'notifications',
  INVITES:       'invites',
  AGREEMENTS:    'agreements',
} as const;

export const STORAGE_PATHS = {
  avatars: 'avatars',
  videos:  'videos',
  market:  'market_images',
} as const;
