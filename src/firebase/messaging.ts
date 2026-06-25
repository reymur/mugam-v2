// src/firebase/messaging.ts
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from './config';

async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'android') {
    return Application.getAndroidId() ?? 'unknown-android';
  } else {
    return (await Application.getIosIdForVendorAsync()) ?? 'unknown-ios';
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

export async function registerFCMToken(uid: string): Promise<() => void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return () => {};
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '02a64c17-1949-4284-ab8a-12d07e4cf235',
    });
    const expoPushToken = tokenData.data;
    const deviceId = await getDeviceId();
    // Save token under users/{uid}/pushTokens/{deviceId}
    await setDoc(
      doc(fbFirestore, COLLECTIONS.USERS, uid, 'pushTokens', deviceId),
      { token: expoPushToken, updatedAt: new Date().toISOString() }
    );
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    // Return cleanup — remove token on logout
    return async () => {
      await deleteDoc(doc(fbFirestore, COLLECTIONS.USERS, uid, 'pushTokens', deviceId)).catch(() => {});
    };
  } catch (e) {
    console.warn('registerFCMToken error:', e);
    return () => {};
  }
}

async function getTokensForUid(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(fbFirestore, COLLECTIONS.USERS, uid, 'pushTokens'));
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

export async function sendPushToUser(uid: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  try {
    const tokens = await getTokensForUid(uid);
    await Promise.all(tokens.map(token =>
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default' }),
      }).catch(() => {})
    ));
  } catch (e) {
    console.warn('sendPushToUser error:', e);
  }
}

export async function sendPushToUsers(uids: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
  try {
    // Fetch all tokens for all uids
    const tokenArrays = await Promise.all(uids.map(uid => getTokensForUid(uid)));
    // Deduplicate by token
    const tokenSet = new Set<string>(tokenArrays.flat());
    // Send to unique tokens
    await Promise.all(
      [...tokenSet].map(token =>
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default' }),
        }).catch(() => {})
      )
    );
  } catch (e) {
    console.warn('sendPushToUsers error:', e);
  }
}

export function setupForegroundHandler(): () => void {
  const sub = Notifications.addNotificationReceivedListener(() => {});
  return () => sub.remove();
}

export function setupBackgroundHandler(): void {}

export function onNotificationTap(
  callback: (data: Record<string, string>) => void,
): () => void {
  // Handle tap when app is open or in background
  // actionIdentifier check ensures this only fires on actual tap, not on receive
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = response.notification.request.content.data as Record<string, string>;
    callback(data);
  });

  // Handle tap when app was closed (killed)
  const LAST_NOTIF_KEY = 'lastHandledNotifId';
  Notifications.getLastNotificationResponseAsync().then(response => {
    if (!response) return;
    const id = response.notification.request.identifier;
    const lastId = (global as any)[LAST_NOTIF_KEY];
    if (lastId === id) return;
    (global as any)[LAST_NOTIF_KEY] = id;
    const data = response.notification.request.content.data as Record<string, string>;
    callback(data);
  }).catch(() => {});

  return () => sub.remove();
}
