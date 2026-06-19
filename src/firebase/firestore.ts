import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment,
  writeBatch, arrayUnion, arrayRemove,
  type QuerySnapshot, type DocumentData,
} from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from './config';
import type {
  Musician, GigItem, BoardItem, MarketItem,
  FunCard, VideoItem, ChatItem, Message, Event, Room, Invite,
} from '../types';

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
    const chats = snap.docs
      .map(d => {
        const data = d.data();
        const isInitiator = (data.initiatorUid ?? '') === uid;
        // Initiator sees recipient's name (data.name)
        // Recipient sees initiator's name (data.initiatorName)
        const name = isInitiator
          ? (data.name ?? '')
          : (data.initiatorName ?? data.name ?? '');
        return {
          id: d.id,
          name,
          emoji: data.emoji ?? '💬',
          preview: data.preview ?? '',
          time: tsToTime(data.lastMessageAt),
          unread: data.unreadCount?.[uid] ?? data[`unreadCount.${uid}`] ?? 0,
          isGroup: data.isGroup ?? false,
          members: data.members ?? [],
          online: data.online ?? false,
          initiatorUid: data.initiatorUid ?? '',
          completed: data.completed ?? false,
        } as ChatItem;
      })
      .filter(c => {
        const isInitiator = c.initiatorUid === uid;
        const hasMessages = !!c.preview;
        const isCompleted = !!(c as any).completed;
        // Hide completed chats and hide empty chats from recipient
        return !isCompleted && (isInitiator || hasMessages);
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
  const chatRef = doc(fbFirestore, COLLECTIONS.CHATS, chatId);

  // Get members to increment unread for everyone except sender
  const chatSnap = await getDoc(chatRef);
  const members: string[] = chatSnap.exists() ? (chatSnap.data().members ?? []) : [];

  const batch = writeBatch(fbFirestore);

  const msgRef = doc(collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES));
  batch.set(msgRef, { text, senderId, senderName, createdAt: serverTimestamp() });

  // Build update — use dot notation correctly for nested map fields
  const chatUpdate: Record<string, any> = {
    preview:       `${senderName}: ${text.slice(0, 60)}`,
    lastMessageAt: serverTimestamp(),
  };

  // Increment unread for each member except sender
  members.forEach(uid => {
    if (uid !== senderId) {
      chatUpdate[`unreadCount.${uid}`] = increment(1);
    }
  });

  batch.update(chatRef, chatUpdate);
  await batch.commit();
}

export async function markChatAsRead(chatId: string, uid: string): Promise<void> {
  const chatRef = doc(fbFirestore, COLLECTIONS.CHATS, chatId);
  await updateDoc(chatRef, { [`unreadCount.${uid}`]: 0 });
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

// ── DIRECT CHAT ───────────────────────────────────────────
export async function completeChat(chatId: string): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      completed: true,
    });
  } catch { /* ignore */ }
}

export async function createOrGetDirectChat(
  myId:       string,
  otherId:    string,
  otherName:  string,
  otherEmoji: string,
  myName?:    string,
  myCity?:    string,
): Promise<string> {
  // Check if there's an existing uncompleted chat
  const q = query(
    collection(fbFirestore, COLLECTIONS.CHATS),
    where('members', 'array-contains', myId),
    where('isGroup', '==', false),
    where('completed', '==', false),
    limit(20),
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find(d => {
    const data = d.data();
    const m: string[] = data.members ?? [];
    return m.includes(otherId) && !data.closedBy;
  });
  if (existing) return existing.id;

  // Create new chat (first time or after completed chat)
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.CHATS), {
    members:       [myId, otherId],
    isGroup:       false,
    name:          otherName,
    initiatorName: myName ?? '',
    initiatorUid:  myId,
    emoji:         otherEmoji,
    preview:       '',
    completed:     false,
    lastMessageAt: serverTimestamp(),
    unreadCount:   {},
    createdAt:     serverTimestamp(),
  });

  // Auto-create invite so recipient sees "cavab gözləyir" banner
  if (myName) {
    await addDoc(collection(fbFirestore, COLLECTIONS.INVITES), {
      musicianId:    otherId,
      musicianName:  otherName,
      musicianEmoji: otherEmoji,
      musicianInst:  '',
      fromUid:       myId,
      fromName:      myName,
      fromCity:      myCity ?? '',
      status:        'pending',
      createdAt:     serverTimestamp(),
    });
  }

  return ref.id;
}

// ── AGREEMENTS ────────────────────────────────────────────
import type { Agreement } from '../types';

// Create agreement when Sevgi clicks "Razıyam"
export async function createAgreement(
  fromUid:       string,
  fromName:      string,
  toUid:         string,
  toName:        string,
  chatId?:       string,
  eventDate?:    string,
  eventType?:    string,
  eventLocation?: string,
  eventNotes?:   string,
): Promise<string> {
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.AGREEMENTS), {
    fromUid, fromName, toUid, toName,
    chatId:        chatId        ?? null,
    status:        'agreed',
    eventDate:     eventDate     ?? null,
    eventType:     eventType     ?? null,
    eventLocation: eventLocation ?? null,
    eventNotes:    eventNotes    ?? null,
    createdAt:     serverTimestamp(),
  });
  return ref.id;
}

// Subscribe to agreements for current user (both as from and to)
export function subscribeAgreements(
  uid: string,
  cb: (agreements: Agreement[]) => void,
): () => void {
  // Two queries — as initiator and as responder
  const q1 = query(collection(fbFirestore, COLLECTIONS.AGREEMENTS), where('fromUid', '==', uid));
  const q2 = query(collection(fbFirestore, COLLECTIONS.AGREEMENTS), where('toUid',   '==', uid));

  let list1: Agreement[] = [];
  let list2: Agreement[] = [];

  const merge = () => {
    const merged = [...list1, ...list2];
    const unique = merged.filter((a, i) => merged.findIndex(b => b.id === a.id) === i);
    cb(unique);
  };

  const unsub1 = onSnapshot(q1, snap => { list1 = snapToList<Agreement>(snap); merge(); });
  const unsub2 = onSnapshot(q2, snap => { list2 = snapToList<Agreement>(snap); merge(); });

  return () => { unsub1(); unsub2(); };
}

// Check if agreement exists between two users
export async function getAgreement(uid1: string, uid2: string): Promise<Agreement | null> {
  const q1 = await getDocs(query(
    collection(fbFirestore, COLLECTIONS.AGREEMENTS),
    where('fromUid', '==', uid1),
    where('toUid',   '==', uid2),
  ));
  if (!q1.empty) return { id: q1.docs[0].id, ...q1.docs[0].data() } as Agreement;

  const q2 = await getDocs(query(
    collection(fbFirestore, COLLECTIONS.AGREEMENTS),
    where('fromUid', '==', uid2),
    where('toUid',   '==', uid1),
  ));
  if (!q2.empty) return { id: q2.docs[0].id, ...q2.docs[0].data() } as Agreement;

  return null;
}

// ── ONLINE STATUS ─────────────────────────────────────────
export async function setUserOnlineStatus(uid: string, online: boolean): Promise<void> {
  try {
    // Update in musicians collection
    await setDoc(
      doc(fbFirestore, COLLECTIONS.MUSICIANS, uid),
      { online, updatedAt: serverTimestamp() },
      { merge: true }
    );
    // Update in users collection
    await updateDoc(doc(fbFirestore, COLLECTIONS.USERS, uid), {
      online,
      lastSeen: serverTimestamp(),
    });
  } catch { /* ignore — user may not be in musicians */ }
}
export async function saveReadAgreementId(uid: string, agreementId: string): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.USERS, uid), {
      readAgreementIds: arrayUnion(agreementId),
    });
  } catch { /* ignore */ }
}

export async function loadReadAgreementIds(uid: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(fbFirestore, COLLECTIONS.USERS, uid));
    if (snap.exists()) return snap.data().readAgreementIds ?? [];
  } catch { /* ignore */ }
  return [];
}

export async function markChatAsReadBy(chatId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      readBy: arrayUnion(uid),
    });
  } catch { /* ignore */ }
}

export async function setTyping(chatId: string, uid: string, isTyping: boolean): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      [`typing.${uid}`]: isTyping ? Date.now() : null,
    });
  } catch { /* ignore */ }
}

export function subscribeChatMeta(
  chatId: string,
  cb: (data: { readBy: string[]; typing: Record<string, number>; cancelledBy: string | null; closedBy: string | null; eventDate: string | null; eventType: string; eventLocation: string; eventNotes: string; waitingForDate: boolean }) => void
): () => void {
  const unsub = onSnapshot(doc(fbFirestore, COLLECTIONS.CHATS, chatId), snap => {
    if (snap.exists()) {
      cb({
        readBy:        snap.data().readBy        ?? [],
        typing:        snap.data().typing        ?? {},
        cancelledBy:   snap.data().cancelledBy   ?? null,
        closedBy:      snap.data().closedBy      ?? null,
        eventDate:      snap.data().eventDate      ?? null,
        eventType:      snap.data().eventType      ?? 'Toy',
        eventLocation:  snap.data().eventLocation  ?? '',
        eventNotes:     snap.data().eventNotes     ?? '',
        waitingForDate: snap.data().waitingForDate ?? false,
      });
    }
  });
  return unsub;
}

export async function cancelChat(
  chatId: string,
  cancelledByUid: string,
  cancelledByName: string,
  otherUid: string,
  otherName: string,
): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      cancelledBy: cancelledByUid,
      completed:   true,
    });
    await addDoc(collection(fbFirestore, COLLECTIONS.AGREEMENTS), {
      fromUid:     cancelledByUid,
      fromName:    cancelledByName,
      toUid:       otherUid,
      toName:      otherName,
      chatId:      chatId,
      status:      'cancelled',
      cancelledBy: cancelledByUid,
      cancelledByName: cancelledByName,
      createdAt:   serverTimestamp(),
    });
  } catch { /* ignore */ }
}

export async function removeReadBy(chatId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      readBy: arrayRemove(uid),
    });
  } catch { /* ignore */ }
}

export async function closeChat(chatId: string, closedByUid: string): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      closedBy: closedByUid,
    });
  } catch { /* ignore */ }
}

export async function deleteChatWithMessages(chatId: string, fromUid?: string, musicianId?: string): Promise<void> {
  try {
    const batch = writeBatch(fbFirestore);
    // Delete all messages
    const msgsSnap = await getDocs(collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES));
    msgsSnap.docs.forEach(d => batch.delete(d.ref));
    // Delete chat document
    batch.delete(doc(fbFirestore, COLLECTIONS.CHATS, chatId));
    // Delete related invite
    if (fromUid && musicianId) {
      const invitesSnap = await getDocs(query(
        collection(fbFirestore, COLLECTIONS.INVITES),
        where('fromUid', '==', fromUid),
        where('musicianId', '==', musicianId),
      ));
      invitesSnap.docs.forEach(d => batch.delete(d.ref));
    }
    await batch.commit();
  } catch { /* ignore */ }
}

export async function saveChatEventDate(
  chatId: string,
  eventDate: Date,
  eventType: string,
  eventLocation: string,
  eventNotes?: string,
): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      eventDate:     eventDate.toISOString(),
      eventType,
      eventLocation,
      eventNotes:    eventNotes ?? '',
    });
  } catch { /* ignore */ }
}

export async function setWaitingForDate(chatId: string, waiting: boolean): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      waitingForDate: waiting,
    });
  } catch { /* ignore */ }
}
