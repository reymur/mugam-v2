import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment,
  writeBatch, arrayUnion, arrayRemove,
  type QuerySnapshot, type DocumentData,
} from 'firebase/firestore';
import { fbFirestore, COLLECTIONS } from './config';
import { sendPushToUser } from './messaging';
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

// ── USERS ─────────────────────────────────────────────────
export async function getUsersByUids(uids: string[]): Promise<Record<string, { name: string; emoji: string }>> {
  const result: Record<string, { name: string; emoji: string }> = {};
  await Promise.all(uids.map(async uid => {
    try {
      const snap = await getDoc(doc(fbFirestore, COLLECTIONS.USERS, uid));
      if (snap.exists()) {
        const d = snap.data();
        result[uid] = { name: d.displayName ?? d.name ?? 'İstifadəçi', emoji: d.emoji ?? '👤' };
      }
    } catch {}
  }));
  return result;
}

// ── MUSICIANS ─────────────────────────────────────────────
export async function fetchMusicians(): Promise<Musician[]> {
  const q = query(collection(fbFirestore, COLLECTIONS.USERS), where('role', '==', 'musician'), limit(50));
  return snapToList<Musician>(await getDocs(q));
}

export function subscribeMusicians(cb: (items: Musician[]) => void): () => void {
  const q = query(collection(fbFirestore, COLLECTIONS.USERS), where('role', '==', 'musician'), limit(50));
  return onSnapshot(q, snap => cb(snapToList<Musician>(snap)));
}

export async function saveUserAsMusician(uid: string, data: Partial<Musician>): Promise<void> {
  // Save to users collection with role = musician
  await setDoc(doc(fbFirestore, COLLECTIONS.USERS, uid), {
    id: uid,
    uid,
    name: data.name ?? '',
    emoji: data.emoji ?? '🎵',
    instrument: data.instrument ?? '',
    specialty: data.instrument ?? data.specialty ?? '',
    city: data.city ?? '',
    rating: data.rating ?? 0,
    reviews: data.reviews ?? 0,
    available: data.available ?? false,
    goldRing: data.goldRing ?? false,
    online: data.online ?? true,
    bio: data.bio ?? '',
    role: 'musician',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveUserProfile(uid: string, data: {
  role?: import('../types').UserRole;
  specialty?: string;
  displayName?: string;
  emoji?: string;
  city?: string;
  bio?: string;
  instrument?: string;
}): Promise<void> {
  await setDoc(doc(fbFirestore, COLLECTIONS.USERS, uid), {
    ...data,
    updatedAt: serverTimestamp(),
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
export function subscribeChat(chatId: string, cb: (data: any) => void): () => void {
  return onSnapshot(doc(fbFirestore, COLLECTIONS.CHATS, chatId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() });
  });
}

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
          admins: data.admins ?? [],
          createdBy: data.createdBy ?? '',
          photoURL: data.photoURL ?? null,
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
        createdAt: data.createdAt,
        deletedForAll: data.deletedForAll ?? false,
        deletedFor: data.deletedFor ?? [],
        deletedAt: data.deletedAt ?? null,
        replyTo: data.replyTo ?? null,
        senderName: data.senderName ?? '',
        isSystem: data.isSystem ?? false,
      } as Message;
    });
    cb(msgs);
  });
}

export async function sendMessage(chatId: string, text: string, senderId: string, senderName: string, replyTo?: { id: string; text: string; senderName: string }): Promise<void> {
  const chatRef = doc(fbFirestore, COLLECTIONS.CHATS, chatId);

  // Get members to increment unread for everyone except sender
  const chatSnap = await getDoc(chatRef);
  const members: string[] = chatSnap.exists() ? (chatSnap.data().members ?? []) : [];

  const batch = writeBatch(fbFirestore);

  const msgData: Record<string, any> = { text, senderId, senderName, createdAt: serverTimestamp() };
  if (replyTo) msgData.replyTo = replyTo;

  const msgRef = doc(collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES));
  batch.set(msgRef, msgData);

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
    await updateDoc(doc(fbFirestore, COLLECTIONS.USERS, uid), {
      online,
      lastSeen: serverTimestamp(),
    });
  } catch { /* ignore */ }
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

export async function markChatAsDelivered(chatId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      [`deliveredTo.${uid}`]: true,
    });
  } catch { /* ignore */ }
}

export async function markChatAsReadBy(chatId: string, uid: string, lastMsgId?: string): Promise<void> {
  try {
    const update: Record<string, any> = {
      readBy: arrayUnion(uid),
      [`lastReadAt.${uid}`]: new Date().toISOString(),
    };
    if (lastMsgId) {
      update[`lastReadMsgId.${uid}`] = lastMsgId;
    }
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), update);
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
  cb: (data: { readBy: string[]; typing: Record<string, number>; cancelledBy: string | null; closedBy: string | null; eventDate: string | null; eventType: string; eventLocation: string; eventNotes: string; waitingForDate: boolean; jobOfferBy: string | null; clearedBy: Record<string, string>; lastReadAt: Record<string, string>; lastReadMsgId: Record<string, string>; deliveredTo: Record<string, boolean> }) => void
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
        jobOfferBy:     snap.data().jobOfferBy     ?? null,
        clearedBy:      snap.data().clearedBy      ?? {},
        lastReadAt:     snap.data().lastReadAt     ?? {},
        lastReadMsgId:  snap.data().lastReadMsgId  ?? {},
        deliveredTo: snap.data().deliveredTo ?? {},
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
  initiatorUid?: string,
  initiatorName?: string,
): Promise<void> {
  try {
    await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
      cancelledBy: cancelledByUid,
      completed:   true,
    });
    const fUid  = initiatorUid  ?? cancelledByUid;
    const fName = initiatorName ?? cancelledByName;
    const tUid  = initiatorUid  ? (initiatorUid === cancelledByUid ? otherUid   : cancelledByUid)   : otherUid;
    const tName = initiatorName ? (initiatorUid === cancelledByUid ? otherName  : cancelledByName)  : otherName;
    await addDoc(collection(fbFirestore, COLLECTIONS.AGREEMENTS), {
      fromUid:         fUid,
      fromName:        fName,
      toUid:           tUid,
      toName:          tName,
      chatId:          chatId,
      status:          'cancelled',
      cancelledBy:     cancelledByUid,
      cancelledByName: cancelledByName,
      createdAt:       serverTimestamp(),
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

// ── Personal Events ──────────────────────────────────────
export async function addPersonalEvent(
  uid: string,
  event: {
    date: string;
    type: string;
    location: string;
    notes: string;
    musicians: string[];
    isAgree?: boolean;
    agreementChatId?: string;
    partnerUid?: string;
    partnerName?: string;
    status?: 'agreed' | 'cancelled';
    cancelledBy?: string;
  }
): Promise<string> {
  const ref = await addDoc(
    collection(fbFirestore, 'personalEvents'),
    {
      ...event,
      ownerUid: uid,
      isAgree: event.isAgree ?? false,
      agreementChatId: event.agreementChatId ?? null,
      partnerUid: event.partnerUid ?? null,
      partnerName: event.partnerName ?? null,
      status: event.status ?? 'agreed',
      cancelledBy: event.cancelledBy ?? null,
      createdAt: serverTimestamp(),
    }
  );
  return ref.id;
}

// Subscribe to events owned by user
export function subscribePersonalEvents(
  uid: string,
  cb: (events: any[]) => void
): () => void {
  const q = query(
    collection(fbFirestore, 'personalEvents'),
    where('ownerUid', '==', uid)
  );
  return onSnapshot(q,
    (snap) => {
      const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('personalEvents loaded:', events.length, 'for uid:', uid);
      cb(events);
    },
    () => cb([])
  );
}

// Subscribe to events where user is a musician
export function subscribeEventsAsMusician(
  uid: string,
  cb: (events: any[]) => void
): () => void {
  const q = query(
    collection(fbFirestore, 'personalEvents'),
    where('musicians', 'array-contains', uid)
  );
  return onSnapshot(q,
    (snap) => {
      const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cb(events);
    },
    () => cb([])
  );
}

export async function deletePersonalEvent(
  uid: string,
  eventId: string
): Promise<void> {
  await deleteDoc(
    doc(fbFirestore, 'personalEvents', eventId)
  );
}

export async function updatePersonalEvent(
  eventId: string,
  data: Partial<{
    date: string;
    type: string;
    location: string;
    notes: string;
    musicians: string[];
  }>
): Promise<void> {
  await updateDoc(
    doc(fbFirestore, 'personalEvents', eventId),
    data
  );
}

export async function updateAgreement(
  agreementId: string,
  data: Partial<{
    eventType: string;
    eventDate: string;
    eventLocation: string;
    eventNotes: string;
  }>
): Promise<void> {
  await updateDoc(
    doc(fbFirestore, COLLECTIONS.AGREEMENTS, agreementId),
    data
  );
}

export async function addPersonalEventFromAgreement(
  ownerUid: string,
  data: {
    date: string;
    type: string;
    location: string;
    notes: string;
    musicians: string[];
    fromAgreement: boolean;
  }
): Promise<void> {
  await addDoc(collection(fbFirestore, 'personalEvents'), {
    ownerUid,
    date: data.date,
    type: data.type,
    location: data.location,
    notes: data.notes,
    musicians: data.musicians,
    fromAgreement: data.fromAgreement,
    createdAt: serverTimestamp(),
  });
}

export async function cancelPersonalEventAgreement(
  eventId: string,
  cancelledByUid: string
): Promise<void> {
  await updateDoc(
    doc(fbFirestore, 'personalEvents', eventId),
    { status: 'cancelled', cancelledBy: cancelledByUid }
  );
}

export async function findPersonalEventByAgreementChat(
  chatId: string,
  ownerUid: string
): Promise<string | null> {
  const q = query(
    collection(fbFirestore, 'personalEvents'),
    where('agreementChatId', '==', chatId),
    where('ownerUid', '==', ownerUid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function setJobOffer(chatId: string, offerByUid: string): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
    jobOfferBy: offerByUid,
  });
}

export async function clearChatForUser(chatId: string, uid: string): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
    [`clearedBy.${uid}`]: new Date().toISOString(),
  });
}

export async function deleteMessageForAll(chatId: string, messageId: string): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES, messageId), {
    deletedForAll: true,
    deletedAt: new Date().toISOString(),
    text: '',
  });
}

export async function deleteMessageForMe(chatId: string, messageId: string, uid: string): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES, messageId), {
    deletedFor: arrayUnion(uid),
  });
}

export async function deleteMessagePermanently(chatId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES, messageId));
}

export function subscribeUserOnline(uid: string, cb: (online: boolean) => void): () => void {
  return onSnapshot(doc(fbFirestore, COLLECTIONS.USERS, uid), snap => {
    if (snap.exists()) cb(snap.data().online ?? false);
  });
}

export async function markAllChatsDelivered(uid: string): Promise<void> {
  try {
    const q = query(
      collection(fbFirestore, COLLECTIONS.CHATS),
      where('members', 'array-contains', uid),
      where('completed', '==', false),
    );
    const snap = await getDocs(q);
    const batch = writeBatch(fbFirestore);
    snap.docs.forEach(d => {
      if (!d.data().closedBy) {
        batch.update(d.ref, { [`deliveredTo.${uid}`]: true });
      }
    });
    await batch.commit();
  } catch { /* ignore */ }
}

export async function createGroupChat(
  creatorUid: string,
  creatorName: string,
  groupName: string,
  memberUids: string[],
  emoji: string,
  photoURL?: string,
): Promise<string> {
  const members = [creatorUid, ...memberUids.filter(u => u !== creatorUid)];
  const ref = await addDoc(collection(fbFirestore, COLLECTIONS.CHATS), {
    isGroup:     true,
    name:        groupName,
    emoji:       emoji,
    photoURL:    photoURL ?? null,
    members:     members,
    admins:      [creatorUid],
    createdBy:   creatorUid,
    preview:     `${creatorName} qrupu yaratdı`,
    lastMessageAt: serverTimestamp(),
    createdAt:   serverTimestamp(),
    completed:   false,
    unreadCount: {},
  });

  // System message
  await addDoc(collection(fbFirestore, COLLECTIONS.CHATS, ref.id, COLLECTIONS.MESSAGES), {
    text:       `${creatorName} qrupu yaratdı`,
    senderId:   'system',
    senderName: 'system',
    createdAt:  serverTimestamp(),
    isSystem:   true,
  });

  return ref.id;
}

export async function leaveGroup(chatId: string, uid: string, userName: string): Promise<void> {
  const chatRef = doc(fbFirestore, COLLECTIONS.CHATS, chatId);
  await updateDoc(chatRef, {
    members: arrayRemove(uid),
    admins: arrayRemove(uid),
  });
  // System message
  await addDoc(collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES), {
    text:      `${userName} qrupdan çıxdı`,
    senderId:  'system',
    senderName: 'system',
    createdAt: serverTimestamp(),
    isSystem:  true,
  });
}

export async function addGroupMember(chatId: string, uid: string, userName: string, addedByName: string, chatName?: string): Promise<void> {
  const chatRef = doc(fbFirestore, COLLECTIONS.CHATS, chatId);
  await updateDoc(chatRef, {
    members: arrayUnion(uid),
    lastMessageAt: serverTimestamp(),
  });
  await addDoc(collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES), {
    text:      `${addedByName} ${userName} qrupa əlavə etdi`,
    senderId:  'system',
    senderName: 'system',
    createdAt: serverTimestamp(),
    isSystem:  true,
  });
  await sendPushToUser(uid, chatName ?? 'Qrup', 'Sizi qrupa əlavə etdilər', { chatId, type: 'group_added' });
}

export async function removeGroupMember(chatId: string, uid: string, userName: string, removedByName: string, chatName?: string): Promise<void> {
  const chatRef = doc(fbFirestore, COLLECTIONS.CHATS, chatId);
  await updateDoc(chatRef, {
    members: arrayRemove(uid),
    admins: arrayRemove(uid),
    lastMessageAt: serverTimestamp(),
  });
  await addDoc(collection(fbFirestore, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES), {
    text:      `${removedByName} ${userName} qrupdan çıxardı`,
    senderId:  'system',
    senderName: 'system',
    createdAt: serverTimestamp(),
    isSystem:  true,
  });
  await sendPushToUser(uid, chatName ?? 'Qrup', 'Sizi qrupdan çıxardılar', { chatId, type: 'group_removed' });
}

export async function makeGroupAdmin(chatId: string, uid: string, userName: string): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
    admins: arrayUnion(uid),
  });
}

export async function updateGroupInfo(chatId: string, name: string, emoji: string, photoURL?: string): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), {
    name,
    emoji,
    ...(photoURL !== undefined && { photoURL }),
  });
}

export async function uploadGroupPhoto(chatId: string, uri: string): Promise<string> {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const { fbStorage } = await import('./config');
  const blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('XHR failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
  const storageRef = ref(fbStorage, `groups/${chatId}/avatar.jpg`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(fbFirestore, COLLECTIONS.CHATS, chatId), { photoURL: url });
  return url;
}
