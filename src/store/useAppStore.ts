import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { create } from 'zustand';
import * as FireAuth from '../firebase/auth';
import { COLLECTIONS, fbFirestore } from '../firebase/config';
import * as FireStore from '../firebase/firestore';
import * as FireMsg from '../firebase/messaging';
import type { BoardItem, ChatItem, Event, FunCard, GigItem, Invite, Lang, MarketItem, Message, Musician, Room, UserProfile, VideoItem } from '../types';

// Re-export all shared types from types.ts (screens import from here)
export type { BoardItem, ChatItem, Event, FunCard, GigItem, Invite, MarketItem, Message, Musician, Room, UserProfile, VideoItem } from '../types';

interface AppStore {
  user:            UserProfile | null;
  authLoading:     boolean;
  authError:       string | null;
  isAuthenticated: boolean;
  register:        (email: string, pass: string, name: string, inst: string, city: string) => Promise<void>;
  login:           (email: string, pass: string) => Promise<void>;
  logout:          () => Promise<void>;
  resetPassword:   (email: string) => Promise<void>;
  setUser:         (u: UserProfile | null) => void;
  clearAuthError:  () => void;

  lang:    Lang;
  setLang: (l: Lang) => Promise<void>;

  toast:     string | null;
  showToast: (msg: string) => void;

  musicians:   Musician[];
  events:      Event[];
  rooms:       Room[];
  gigs:        GigItem[];
  boardItems:  BoardItem[];
  marketItems: MarketItem[];
  stories:     FunCard[];
  videos:      VideoItem[];
  chats:       ChatItem[];
  messages:    Record<string, Message[]>;

  // Realtime unsub refs
  _unsubs:   Array<() => void>;
  _addUnsub: (fn: () => void) => void;

  loadInitialData:   () => Promise<void>;
  subscribeRealtime: (uid: string) => void;
  unsubscribeAll:    () => void;

  addGig:       (g: Omit<GigItem, 'id'>)       => Promise<void>;
  addBoardItem: (b: Omit<BoardItem, 'id'>)      => Promise<void>;
  addMarketItem:(m: Omit<MarketItem, 'id'>)     => Promise<void>;
  addStory:     (s: Omit<FunCard, 'id'>)        => Promise<void>;
  applyGig:     (id: string)                    => Promise<void>;
  reactStory:   (storyId: string, reaction: 'laugh' | 'heart' | 'clap') => Promise<void>;
  sendMessage:  (chatId: string, text: string)  => Promise<void>;
  loadMessages: (chatId: string)                => void;

  // Invites
  myInvites:       Invite[];          // invites sent by current user
  receivedInvites: Invite[];          // invites received (for musician view)
  // invitedMusicianIds: set of musician IDs current user has invited (pending)
  invitedMusicianIds: Set<string>;
  sendInvite:      (musician: Musician) => Promise<void>;
  cancelInvite:    (musicianId: string) => Promise<void>;
  subscribeInvites:(uid: string) => void;
  updateInviteStatus: (inviteId: string, status: 'accepted' | 'declined') => Promise<void>;

  initApp: () => Promise<void>;
}

// ── Seed data (fallback when Firestore empty / offline) ───
const SEED_MUSICIANS: Musician[] = [
  { id: 'm1', name: 'Anar Musayev',    emoji: '🎻', instrument: 'Kaman',      city: 'Bakı',     rating: 5, reviews: 47, available: true },
  { id: 'm2', name: 'Leyla Əliyeva',   emoji: '🎤', instrument: 'Müğənni',    city: 'Gəncə',    rating: 5, reviews: 89, available: true, goldRing: true },
  { id: 'm3', name: 'Rauf Əhmədov',    emoji: '🪗', instrument: 'Qarmon',     city: 'Şəki',     rating: 5, reviews: 31 },
  { id: 'm4', name: 'Samir Hüseynov',  emoji: '🎵', instrument: 'Tar',        city: 'Bakı',     rating: 5, reviews: 62, available: true },
  { id: 'm5', name: 'Elnur Babayev',   emoji: '🎷', instrument: 'Balaban',    city: 'Lənkəran', rating: 4, reviews: 28 },
  { id: 'm6', name: 'Nigar Məmmədova', emoji: '🎹', instrument: 'Fortepiano', city: 'Bakı',     rating: 4, reviews: 19 },
];
const SEED_EVENTS: Event[] = [
  { id: 'e1', day: '18', month: 'May',  title: 'Muğam Gecəsi',       location: 'Bakı, Hüseynov Sarayı', tags: ['🎻 Muğam','🎟 8 yer'],    tagType: 'gold'  },
  { id: 'e2', day: '25', month: 'May',  title: 'Gəncə Festivalı',    location: 'Gəncə Şəhər Parkı',     tags: ['🏆 Festival','✅ Pulsuz'], tagType: 'green' },
  { id: 'e3', day: '3',  month: 'İyun', title: 'Tar Ustası Konsert', location: 'Bakı, Filarmoniуа',     tags: ['🎵 Tar','🔴 Son 4 yer'],   tagType: 'red'   },
];
const SEED_ROOMS: Room[] = [
  { id: 'r1', emoji: '🏛️', name: 'Ümumi Müzakirə', members: '1 284 üzv', preview: 'Sabah Şəkidə toy var...', live: true,  avatars: ['🎻','🎤','🪗','🎵','🎷'] },
  { id: 'r2', emoji: '🎼', name: 'Muğam Ustadları', members: '847 üzv',   preview: 'Rast muğamının yeni ifası...', live: true, avatars: ['🎻','🎵','🎹'] },
  { id: 'r3', emoji: '💡', name: 'Gənc İfaçılar',  members: '512 üzv',   preview: 'Barmaq texnikası haqqında...', avatars: ['🥁','🎸','🎤'] },
];
const SEED_GIGS: GigItem[] = [
  { id: 'g1', featured: true, hot: true, title: '💍 Toy Gecəsi — Kaman + Müğənni + Zurna', client: 'Əli Nəsirov', location: 'Bakı, Nargiz Hall', date: '15 May', price: '800 AZN', description: 'Bakıda möhtəşəm toy gecəsi.', tags: ['🎻 Kaman','🎤 Müğənni','🎺 Zurna'], views: 156, applications: 34, eventType: '💍 Toy' },
  { id: 'g2', title: '🎭 Gəncə Filarmoniуası — Solo Tar', client: 'Filarmoniуа', location: 'Gəncə', date: 'İyun 2026', price: '450 AZN', description: 'Filarmoniуada solo tar konserti.', tags: ['🎵 Tar'], views: 89, applications: 12, eventType: '🎭 Konsert' },
  { id: 'g3', title: '🏢 Korporativ Gecə — Tam Proqram', client: 'AZ Corp Events', location: 'Bakı, Hyatt', date: '30 May', price: '1200 AZN', description: 'Beynəlxalq şirkətin korporativ gecəsi.', tags: ['🎹 Piano','🎻 Kaman','🎤 Vokal'], views: 77, applications: 19, eventType: '🏢 Korporativ' },
];
const SEED_BOARD: BoardItem[] = [
  { id: 'b0', pinned: true, day: '18', month: 'May', title: '💍 Toy Dəvətnaməsi — Bakı', location: 'Bakı', tags: ['💍 Toy','✅ Ödənişli'], views: 87, active: true, client: 'Əli Hüseynov', description: 'Kaman ifaçısı + Müğənni lazımdır. 18:00–24:00.' },
  { id: 'b1', day: '22', month: 'May', title: '🎭 Konsert — 3 Müğənni Axtarılır', location: 'Bakı, H.Ə. Mərkəzi', tags: ['🎭 Konsert','✅ Ödənişli'], views: 41, active: true, client: 'Orxan Quliyev' },
];
const SEED_MARKET: MarketItem[] = [
  { id: 'mk0', name: 'Əl işi Kaman', emoji: '🎻', price: 680, condition: 'new',      city: 'Bakı',  seller: 'Anar M.', description: 'Alman kaman ustası tərəfindən hazırlanmış.', featured: true },
  { id: 'mk1', name: 'Tar (əl işi)', emoji: '🎵', price: 420, condition: 'good',     city: 'Bakı',  seller: 'Samir H.', description: '15 illik tar. Ceviz ağacından.' },
  { id: 'mk2', name: 'Qarmon',       emoji: '🪗', price: 350, condition: 'used',     city: 'Şəki',  seller: 'Rauf Ə.',  description: 'Şəki ustası tərəfindən hazırlanmış.' },
  { id: 'mk3', name: 'Shure SM58',   emoji: '🎙️',price: 180, condition: 'like-new', city: 'Bakı',  seller: 'Leyla Ə.', description: 'Cəmi 2 dəfə istifadə olunub.' },
];
const SEED_STORIES: FunCard[] = [
  { id: 'st1', author: 'Samir Hüseynov', role: '🎵 Tar ifaçısı', emoji: '😂', emojiTag: '😂', title: 'Saz, Söz, Sazəndə', text: 'Dünən konsertdə mikrofon işləmədi. Amma Ustad Anar akustik ifa etdi — zal ağladı!', reactions: { laugh: 47, heart: 23, clap: 12 }, comments: 8, time: '2 saat əvvəl' },
  { id: 'st2', author: 'Anar Musayev',   role: '🎻 Kaman ifaçısı', emoji: '❤️', emojiTag: '❤️', title: 'Toy Gecəsinin Sirri', text: 'Toyda gəlinin babası 90 yaşındaydı. "Şur" çalmasını istədi. "50 il dinləmirəm" dedi.', reactions: { laugh: 8, heart: 156, clap: 89 }, comments: 21, time: '5 saat əvvəl' },
];
const SEED_VIDEOS: VideoItem[] = [
  { id: 'v1', name: 'Anar Musayev',   emoji: '🎻', instrument: 'Kaman',    city: 'Bakı',  rating: '★★★★★', duration: '2:14', views: 4200,  badge: 'new' },
  { id: 'v2', name: 'Leyla Əliyeva',  emoji: '🎤', instrument: 'Müğənni', city: 'Gəncə', rating: '★★★★★', duration: '3:42', views: 8700 },
  { id: 'v3', name: 'Samir Hüseynov', emoji: '🎵', instrument: 'Tar',     city: 'Bakı',  rating: '★★★★★', duration: '4:10', views: 11200, badge: 'top' },
];

// ── Helper: load user doc from Firestore ──────────────────
async function loadUserDoc(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(fbFirestore, COLLECTIONS.USERS, uid));
    if (snap.exists()) return { uid, ...snap.data() } as UserProfile;
  } catch { /* network error */ }
  return null;
}

// ── Store ─────────────────────────────────────────────────
export const useAppStore = create<AppStore>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────
  user:            null,
  authLoading:     true,  // true until onAuthStateChanged fires
  authError:       null,
  isAuthenticated: false,

  setUser:        (u) => set({ user: u, isAuthenticated: !!u }),
  clearAuthError: ()  => set({ authError: null }),

  register: async (email, pass, name, inst, city) => {
    set({ authLoading: true, authError: null });
    try {
      const cred    = await FireAuth.registerWithEmail(email, pass, name, inst, city);
      const profile: UserProfile = {
        uid: cred.user.uid, displayName: name, email,
        instrument: inst, city, emoji: '🎵', bio: '',
        rating: 0, reviews: 0, available: false,
        verified: false, followers: 0, gigs: 0,
      };
      set({ user: profile, isAuthenticated: true, authLoading: false });
      // FCM token failure should NOT block login
      FireMsg.registerFCMToken(cred.user.uid).then(unsub => get()._addUnsub(unsub)).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qeydiyyat xətası';
      set({ authError: msg, authLoading: false });
      throw err;
    }
  },

  login: async (email, pass) => {
    set({ authLoading: true, authError: null });
    try {
      const cred    = await FireAuth.loginWithEmail(email, pass);
      const profile = await loadUserDoc(cred.user.uid);
      // FIX: always set authLoading=false regardless of whether doc exists
      set({
        user: profile ?? {
          uid: cred.user.uid,
          displayName: cred.user.displayName ?? 'Musiqiçi',
          email: cred.user.email ?? '',
          instrument: '', city: '', emoji: '🎵', bio: '',
          rating: 0, reviews: 0, available: false,
          verified: false, followers: 0, gigs: 0,
        },
        isAuthenticated: true,
        authLoading: false,
      });
      FireMsg.registerFCMToken(cred.user.uid).then(unsub => get()._addUnsub(unsub)).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giriş xətası';
      set({ authError: msg, authLoading: false });
      throw err;
    }
  },

  logout: async () => {
    get().unsubscribeAll();
    set({ user: null, isAuthenticated: false, chats: [], messages: {} });
    await FireAuth.logout();
  },

  resetPassword: async (email) => {
    await FireAuth.resetPassword(email);
  },

  // ── Language ──────────────────────────────────────────
  lang: 'az',
  setLang: async (l) => {
    set({ lang: l });
    await AsyncStorage.setItem('lang', l);
  },

  // ── Toast ─────────────────────────────────────────────
  toast: null,
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 2400);
  },

  // ── Data ──────────────────────────────────────────────
  musicians:   SEED_MUSICIANS,
  events:      SEED_EVENTS,
  rooms:       SEED_ROOMS,
  gigs:        SEED_GIGS,
  boardItems:  SEED_BOARD,
  marketItems: SEED_MARKET,
  stories:     SEED_STORIES,
  videos:      SEED_VIDEOS,
  chats:       [],
  messages:    {},

  myInvites:          [],
  receivedInvites:    [],
  invitedMusicianIds: new Set<string>(),

  // ── Subscriptions ─────────────────────────────────────
  _unsubs:   [],
  // FIX: _addUnsub uses functional update to avoid stale closure on _unsubs
  _addUnsub: (fn) => set(s => ({ _unsubs: [...s._unsubs, fn] })),

  unsubscribeAll: () => {
    get()._unsubs.forEach(fn => fn());
    set({ _unsubs: [] });
  },

  loadInitialData: async () => {
    try {
      const [musicians, gigs, board, market, stories, videos] = await Promise.all([
        FireStore.fetchMusicians().catch(() => [] as Musician[]),
        FireStore.fetchGigs().catch(() => [] as GigItem[]),
        FireStore.fetchBoardItems().catch(() => [] as BoardItem[]),
        FireStore.fetchMarketItems().catch(() => [] as MarketItem[]),
        FireStore.fetchStories().catch(() => [] as FunCard[]),
        FireStore.fetchVideos().catch(() => [] as VideoItem[]),
      ]);
      set({
        musicians:   musicians.length   ? musicians   : SEED_MUSICIANS,
        gigs:        gigs.length        ? gigs        : SEED_GIGS,
        boardItems:  board.length       ? board       : SEED_BOARD,
        marketItems: market.length      ? market      : SEED_MARKET,
        stories:     stories.length     ? stories     : SEED_STORIES,
        videos:      videos.length      ? videos      : SEED_VIDEOS,
      });
    } catch { /* all-catch: keep seed data */ }
  },

  subscribeRealtime: (uid) => {
    const { _addUnsub } = get();
    // Musicians — realtime so new registrations appear instantly
    _addUnsub(FireStore.subscribeMusicians(ms => set({ musicians: ms.length ? ms : SEED_MUSICIANS })));
    _addUnsub(FireStore.subscribeGigs(         gs  => set({ gigs:        gs.length  ? gs  : SEED_GIGS        })));
    _addUnsub(FireStore.subscribeBoardItems(   bs  => set({ boardItems:  bs.length  ? bs  : SEED_BOARD       })));
    _addUnsub(FireStore.subscribeMarketItems(  ms  => set({ marketItems: ms.length  ? ms  : SEED_MARKET      })));
    _addUnsub(FireStore.subscribeChats(uid,    chats => set({ chats })));
  },

  // ── CRUD ──────────────────────────────────────────────
  addGig: async (g) => {
    const uid = get().user?.uid;
    const tempId = `g_${Date.now()}`;
    // Optimistic
    set(s => ({ gigs: [{ ...g, id: tempId }, ...s.gigs] }));
    try {
      const id = await FireStore.addGig({ ...g, authorUid: uid });
      set(s => ({ gigs: s.gigs.map(x => x.id === tempId ? { ...x, id } : x) }));
    } catch { /* keep optimistic */ }
  },

  addBoardItem: async (b) => {
    const uid = get().user?.uid;
    const tempId = `b_${Date.now()}`;
    set(s => ({ boardItems: [{ ...b, id: tempId }, ...s.boardItems] }));
    try {
      const id = await FireStore.addBoardItem({ ...b, authorUid: uid });
      set(s => ({ boardItems: s.boardItems.map(x => x.id === tempId ? { ...x, id } : x) }));
    } catch { /* keep optimistic */ }
  },

  addMarketItem: async (m) => {
    const uid = get().user?.uid;
    const tempId = `m_${Date.now()}`;
    set(s => ({ marketItems: [{ ...m, id: tempId }, ...s.marketItems] }));
    try {
      const id = await FireStore.addMarketItem({ ...m, authorUid: uid });
      set(s => ({ marketItems: s.marketItems.map(x => x.id === tempId ? { ...x, id } : x) }));
    } catch { /* keep optimistic */ }
  },

  addStory: async (st) => {
    const uid  = get().user?.uid;
    const name = get().user?.displayName ?? 'Musiqiçi';
    const tempId = `st_${Date.now()}`;
    const item = { ...st, author: name, authorUid: uid };
    set(s => ({ stories: [{ ...item, id: tempId }, ...s.stories] }));
    try {
      const id = await FireStore.addStory(item);
      set(s => ({ stories: s.stories.map(x => x.id === tempId ? { ...x, id } : x) }));
    } catch { /* keep optimistic */ }
  },

  applyGig: async (id) => {
    const uid = get().user?.uid ?? 'anon';
    set(s => ({
      gigs: s.gigs.map(g =>
        g.id === id ? { ...g, applied: true, applications: g.applications + 1 } : g
      ),
    }));
    try {
      await FireStore.applyToGig(id, uid);
    } catch {
      // Revert
      set(s => ({
        gigs: s.gigs.map(g =>
          g.id === id ? { ...g, applied: false, applications: Math.max(0, g.applications - 1) } : g
        ),
      }));
    }
  },

  reactStory: async (storyId, reaction) => {
    const uid = get().user?.uid ?? 'anon';
    set(s => ({
      stories: s.stories.map(st =>
        st.id === storyId
          ? { ...st, reactions: { ...st.reactions, [reaction]: st.reactions[reaction] + 1 } }
          : st
      ),
    }));
    try {
      await FireStore.reactToStory(storyId, reaction, uid, false);
    } catch { /* keep optimistic */ }
  },

  sendMessage: async (chatId, text) => {
    const user = get().user;
    if (!user) return;
    const time = new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
    const tempMsg: Message = { id: `tmp_${Date.now()}`, text, mine: true, time, senderId: user.uid };
    set(s => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), tempMsg] },
    }));
    try {
      await FireStore.sendMessage(chatId, text, user.uid, user.displayName);
    } catch { /* keep optimistic */ }
  },

  loadMessages: (chatId) => {
    const uid = get().user?.uid;
    const unsub = FireStore.subscribeMessages(chatId, (msgs) => {
      const resolved = msgs.map(m => ({ ...m, mine: m.senderId === uid }));
      set(s => ({ messages: { ...s.messages, [chatId]: resolved } }));
    });
    get()._addUnsub(unsub);
  },

  // ── Invites ───────────────────────────────────────────
  sendInvite: async (musician) => {
    const user = get().user;
    if (!user) return;
    const musicianId = musician.uid ?? musician.id;
    // Optimistic
    set(s => ({
      invitedMusicianIds: new Set([...s.invitedMusicianIds, musicianId]),
    }));
    try {
      await FireStore.sendInvite(
        musicianId,
        musician.name,
        musician.emoji,
        musician.instrument,
        user.uid,
        user.displayName,
        user.city,
      );
    } catch {
      // Revert on error
      set(s => {
        const next = new Set(s.invitedMusicianIds);
        next.delete(musicianId);
        return { invitedMusicianIds: next };
      });
    }
  },

  cancelInvite: async (musicianId) => {
    const uid = get().user?.uid;
    if (!uid) return;
    // Optimistic
    set(s => {
      const next = new Set(s.invitedMusicianIds);
      next.delete(musicianId);
      return { invitedMusicianIds: next };
    });
    try {
      const inviteId = await FireStore.getInviteId(musicianId, uid);
      if (inviteId) await FireStore.cancelInvite(inviteId);
    } catch {
      // Revert
      set(s => ({ invitedMusicianIds: new Set([...s.invitedMusicianIds, musicianId]) }));
    }
  },

  subscribeInvites: (uid) => {
    const { _addUnsub } = get();
    _addUnsub(FireStore.subscribeMyInvites(uid, (invites) => {
      const ids = new Set(invites
        .filter(i => i.status === 'pending' && i.musicianId !== uid)
        .map(i => i.musicianId));
      set({
        myInvites:          invites.filter(i => i.musicianId !== uid),
        invitedMusicianIds: ids,
      });
    }));
    _addUnsub(FireStore.subscribeReceivedInvites(uid, (invites) => {
      set({ receivedInvites: invites.filter(i => i.fromUid !== uid) });
    }));
  },

  updateInviteStatus: async (inviteId, status) => {
    await FireStore.updateInviteStatus(inviteId, status);
    set(s => ({
      receivedInvites: s.receivedInvites.map(i =>
        i.id === inviteId ? { ...i, status } : i
      ),
    }));
  },

  // ── App init ──────────────────────────────────────────
  initApp: async () => {
    const storedLang = await AsyncStorage.getItem('lang');
    if (storedLang === 'az' || storedLang === 'ru') set({ lang: storedLang });

    // Auth state listener
    const unsubAuth = FireAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await loadUserDoc(firebaseUser.uid);
        set({
          user: profile ?? {
            uid:         firebaseUser.uid,
            displayName: firebaseUser.displayName ?? 'Musiqiçi',
            email:       firebaseUser.email ?? '',
            instrument: '', city: '', emoji: '🎵', bio: '',
            rating: 0, reviews: 0, available: false,
            verified: false, followers: 0, gigs: 0,
          },
          isAuthenticated: true,
          authLoading: false,
        });
        get().subscribeRealtime(firebaseUser.uid);
        get().subscribeInvites(firebaseUser.uid);
        FireMsg.registerFCMToken(firebaseUser.uid).then(unsub => get()._addUnsub(unsub)).catch(() => {});
      } else {
        set({ user: null, isAuthenticated: false, authLoading: false });
        get().unsubscribeAll();
      }
    });
    get()._addUnsub(unsubAuth);

    // Push handlers
    const unsubPush = FireMsg.setupForegroundHandler();
    get()._addUnsub(unsubPush);
    FireMsg.setupBackgroundHandler();

    await get().loadInitialData();
  },
}));
