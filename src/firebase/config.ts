import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk",
  authDomain: "mugam-club.firebaseapp.com",
  projectId: "mugam-club",
  storageBucket: "mugam-club.firebasestorage.app",
  messagingSenderId: "1034748814848",
  appId: "1:1034748814848:web:4b2edc2575a211efbc9ae5",
  measurementId: "G-G7ZP3P85DN"
};

let app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// Use initializeAuth with AsyncStorage on first init
// Use getAuth on subsequent hot reloads
export const fbAuth = getApps().length === 1
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);

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
} as const;

export const STORAGE_PATHS = {
  avatars: 'avatars',
  videos:  'videos',
  market:  'market_images',
} as const;