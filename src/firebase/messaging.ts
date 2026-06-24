// src/firebase/messaging.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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
    await updateDoc(doc(fbFirestore, COLLECTIONS.USERS, uid), { expoPushToken });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    return () => {};
  } catch (e) {
    console.warn('registerFCMToken error:', e);
    return () => {};
  }
}

export async function sendPushToUser(uid: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  try {
    const snap = await getDoc(doc(fbFirestore, COLLECTIONS.USERS, uid));
    if (!snap.exists()) return;
    const token = snap.data()?.expoPushToken;
    if (!token) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default' }),
    });
  } catch (e) {
    console.warn('sendPushToUser error:', e);
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
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Record<string, string>;
    console.log('[messaging] addNotificationResponseReceivedListener:', data);
    callback(data);
  });

  // Handle tap when app was closed (killed)
  Notifications.getLastNotificationResponseAsync().then(response => {
    if (!response) return;
    const data = response.notification.request.content.data as Record<string, string>;
    console.log('[messaging] getLastNotificationResponseAsync:', data);
    callback(data);
  }).catch(() => {});

  return () => sub.remove();
}
