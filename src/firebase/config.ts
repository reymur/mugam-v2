import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// firebase/storage is NOT imported — it uses Node.js 'undici' which breaks in React Native
// Storage will be enabled after EAS Build with @react-native-firebase/storage

// ❗ Замени на свои значения из Firebase Console → Project settings → Your apps
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk",
  authDomain: "mugam-club.firebaseapp.com",
  projectId: "mugam-club",
  storageBucket: "mugam-club.firebasestorage.app",
  messagingSenderId: "1034748814848",
  appId: "1:1034748814848:web:4b2edc2575a211efbc9ae5",
  measurementId: "G-G7ZP3P85DN"
};

const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

export const fbAuth      = getAuth(app);
export const fbFirestore = getFirestore(app);
export const fbStorage   = null as any; // disabled in Expo Go

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
} as const;

export const STORAGE_PATHS = {
  avatars: 'avatars',
  videos:  'videos',
  market:  'market_images',
} as const;
