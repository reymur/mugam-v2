// firebase/storage is disabled in Expo Go
// Will be enabled after EAS Build
export async function uploadAvatar(
  _uid: string,
  _localUri: string,
  _onProgress?: (pct: number) => void,
): Promise<string> {
  throw new Error('Storage not available in Expo Go');
}

export async function uploadMarketImage(
  _uid: string,
  _localUri: string,
  _itemId: string,
  _onProgress?: (pct: number) => void,
): Promise<string> {
  throw new Error('Storage not available in Expo Go');
}

export async function uploadVideo(
  _uid: string,
  _localUri: string,
  _onProgress?: (pct: number) => void,
): Promise<string> {
  throw new Error('Storage not available in Expo Go');
}
