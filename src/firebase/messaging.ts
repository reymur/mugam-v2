// src/firebase/messaging.ts
// Push notifications are not supported in Expo Go.
// This is a no-op stub — notifications will work after EAS Build.

export async function registerFCMToken(_uid: string): Promise<() => void> {
  return () => {};
}

export function setupForegroundHandler(): () => void {
  return () => {};
}

export function setupBackgroundHandler(): void {}

export function onNotificationTap(
  _callback: (data: Record<string, string>) => void,
): () => void {
  return () => {};
}
