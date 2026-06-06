import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc, updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot
} from 'firebase/firestore';
import type {
  BoardItem,
  ChatItem,
  Event,
  FunCard,
  GigItem,
  Invite,
  MarketItem,
  Message,
  Musician,
  Room,
  VideoItem,
} from '../types';
import { COLLECTIONS, fbFirestore } from './config';

function snapToList<T>(snap: QuerySnapshot<DocumentData>): T[] {
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
}

function tsToTime(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ── MUSICIANS ─────────────────────────────────────────────
export async function fetchMusicians(): Promise<Musician[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.MUSICIANS), limit(50));
  return snapToList<Musician>(await getDocs(q));
}

export function subscribeMusicians(cb: (items: Musician[]) => void): () => void {
  const q = query(collection(fbFirestore, COLLECTIONS.MUSICIANS), limit(50));
  return onSnapshot(q, snap => cb(snapToList<Musician>(snap)));
}

export async function saveUserAsMusician(uid: string, data: Partial<Musician>): Promise<void> {
  await setDoc(doc(fbFirestore, COLLECTIONS.MUSICIANS, uid), {
    ...data, uid, updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── EVENTS ────────────────────────────────────────────────
export async function fetchEvents(): Promise<Event[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.EVENTS), limit(10));
  return snapToList<Event>(await getDocs(q));
}

// ── ROOMS ─────────────────────────────────────────────────
export async function fetchRooms(): Promise<Room[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.ROOMS), limit(10));
  return snapToList<Room>(await getDocs(q));
}

// ── GIGS ──────────────────────────────────────────────────
export async function fetchGigs(): Promise<GigItem[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.GIGS), orderBy('createdAt', 'desc'), limit(30));
  return snapToList<GigItem>(await getDocs(q));
}

export function subscribeGigs(cb: (items: GigItem[]) => void): () => void {
  const q = query(collection(fbFirestore, COLLECTIONS.GIGS), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, snap => cb(snapToList<GigItem>(snap)));
}

export async function addGig(data: Omit<GigItem, 'id'> & { authorUid?: string }): Promise<string> {
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.GIGS), {
    ...data, active: true, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function applyToGig(gigId: string, uid: string): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.GIGS, gigId), {
    applications: increment(1),
    applicants: arrayUnion(uid),
  });
}

// ── BOARD ─────────────────────────────────────────────────
export async function fetchBoardItems(): Promise<BoardItem[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.BOARD), orderBy('createdAt', 'desc'), limit(30));
  return snapToList<BoardItem>(await getDocs(q));
}

export function subscribeBoardItems(cb: (items: BoardItem[]) => void): () => void {
  const q = query(collection(fbFirestore, COLLECTIONS.BOARD), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, snap => cb(snapToList<BoardItem>(snap)));
}

export async function addBoardItem(data: Omit<BoardItem, 'id'> & { authorUid?: string }): Promise<string> {
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.BOARD), {
    ...data, active: true, createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── MARKET ────────────────────────────────────────────────
export async function fetchMarketItems(): Promise<MarketItem[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.MARKET), orderBy('createdAt', 'desc'), limit(40));
  return snapToList<MarketItem>(await getDocs(q));
}

export function subscribeMarketItems(cb: (items: MarketItem[]) => void): () => void {
  const q = query(collection(fbFirestore, COLLECTIONS.MARKET), orderBy('createdAt', 'desc'), limit(40));
  return onSnapshot(q, snap => cb(snapToList<MarketItem>(snap)));
}

export async function addMarketItem(data: Omit<MarketItem, 'id'> & { authorUid?: string }): Promise<string> {
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.MARKET), {
    ...data, sold: false, createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── STORIES ───────────────────────────────────────────────
export async function fetchStories(): Promise<FunCard[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.STORIES), orderBy('createdAt', 'desc'), limit(20));
  return snapToList<FunCard>(await getDocs(q));
}

export async function addStory(data: Omit<FunCard, 'id'> & { authorUid?: string }): Promise<string> {
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.STORIES), {
    ...data, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function reactToStory(storyId: string, reaction: string, uid: string, remove: boolean): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.STORIES, storyId), {
    [`reactions.${reaction}`]: increment(remove ? -1 : 1),
    reactedBy: arrayUnion(uid),
  });
}

// ── VIDEOS ────────────────────────────────────────────────
export async function fetchVideos(): Promise<VideoItem[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.VIDEOS), limit(20));
  return snapToList<VideoItem>(await getDocs(q));
}

// ── CHATS ─────────────────────────────────────────────────
export function subscribeChats(uid: string, cb: (chats: ChatItem[]) => void): () => void {
  const q = query(
    collection(fbFirestore, COLLECTIONS.CHATS),
    where('members', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
  );
  return onSnapshot(q, snap => {
    const chats = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? '',
        emoji: data.emoji ?? '💬',
        preview: data.preview ?? '',
        time: tsToTime(data.lastMessageAt),
        unread: data.unreadCount?.[uid] ?? 0,
        isGroup: data.isGroup ?? false,
        members: data.members ?? [],
        online: data.online ?? false,
      } as ChatItem;
    });
    cb(chats);
  });
}

// ── MESSAGES ──────────────────────────────────────────────
export function subscribeMessages(chatId: string, cb: (msgs: Message[]) => void): () => void {
  const q = query(
    collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        text: data.text ?? '',
        mine: false,
        time: tsToTime(data.createdAt),
        senderId: data.senderId ?? '',
      } as Message;
    });
    cb(msgs);
  });
}

export async function sendMessage(chatId: string, text: string, senderId: string, senderName: string): Promise<void> {
  const batch = writeBatch(fbFirestore);
  const msgRef = doc(collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES));
  batch.set(msgRef, { text, senderId, senderName, createdAt: serverTimestamp() });
  const chatRef = doc(fbFirestore, COLLECTIONS.CHATS, chatId);
  batch.set(chatRef, {
    preview: `${senderName}: ${text.slice(0, 60)}`,
    lastMessageAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

// ── INVITES ───────────────────────────────────────────────
export async function sendInvite(
  musicianId: string, musicianName: string, musicianEmoji: string,
  musicianInst: string, fromUid: string, fromName: string, fromCity?: string,
): Promise<string> {
  const existing = await getDocs(query(
    collection(fbFirestore, COLLECTIONS.INVITES),
    where('musicianId', '==', musicianId),
    where('fromUid', '==', fromUid),
    where('status', '==', 'pending'),
  ));
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.INVITES), {
    musicianId, musicianName, musicianEmoji, musicianInst,
    fromUid, fromName, fromCity: fromCity ?? '',
    status: 'pending', createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function cancelInvite(inviteId: string): Promise<void> {
  await deleteDoc(doc(fbFirestore, COLLECTIONS.INVITES, inviteId));
}

export async function getInviteId(musicianId: string, fromUid: string): Promise<string | null> {
  const snap = await getDocs(query(
    collection(fbFirestore, COLLECTIONS.INVITES),
    where('musicianId', '==', musicianId),
    where('fromUid', '==', fromUid),
  ));
  return snap.empty ? null : snap.docs[0].id;
}

export function subscribeMyInvites(fromUid: string, cb: (invites: Invite[]) => void): () => void {
  const q = query(
    collection(fbFirestore, COLLECTIONS.INVITES),
    where('fromUid', '==', fromUid),
  );
  return onSnapshot(q, snap => {
    cb(snapToList<Invite>(snap));
  }, err => {
    console.log('subscribeMyInvites error:', err.message);
  });
}

export function subscribeReceivedInvites(musicianUid: string, cb: (invites: Invite[]) => void): () => void {
  const q = query(
    collection(fbFirestore, COLLECTIONS.INVITES),
    where('musicianId', '==', musicianUid),
    where('status', '==', 'pending'),
  );
  return onSnapshot(q, snap => cb(snapToList<Invite>(snap)));
}

export async function updateInviteStatus(inviteId: string, status: 'accepted' | 'declined'): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.INVITES, inviteId), { status });
}
