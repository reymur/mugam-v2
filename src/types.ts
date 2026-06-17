// src/types.ts — all shared types, no circular deps
export interface UserProfile {
  uid:         string;
  displayName: string;
  email:       string;
  instrument:  string;
  city:        string;
  emoji:       string;
  bio:         string;
  rating:      number;
  reviews:     number;
  available:   boolean;
  verified:    boolean;
  followers:   number;
  gigs:        number;
  photoURL?:   string;
  fcmToken?:   string;
}

export interface Musician {
  id:          string;
  name:        string;
  emoji:       string;
  instrument:  string;
  city:        string;
  rating:      number;
  reviews:     number;
  available?:  boolean;
  goldRing?:   boolean;
  online?:     boolean;
  bio?:        string;
  experience?: string;
  photoURL?:   string;
  uid?:        string;
}

export interface Event {
  id:       string;
  day:      string;
  month:    string;
  title:    string;
  location: string;
  tags:     string[];
  spots?:   string;
  tagType?: 'gold' | 'red' | 'green';
}

export interface Room {
  id:       string;
  emoji:    string;
  name:     string;
  members:  string;
  preview:  string;
  live?:    boolean;
  avatars?: string[];
}

export interface GigItem {
  id:           string;
  title:        string;
  client:       string;
  location:     string;
  date?:        string;
  price:        string;
  description:  string;
  tags:         string[];
  views:        number;
  applications: number;
  featured?:    boolean;
  hot?:         boolean;
  eventType?:   string;
  applied?:     boolean;
  authorUid?:   string;
  active?:      boolean;
}

export interface BoardItem {
  id:           string;
  day:          string;
  month:        string;
  title:        string;
  location:     string;
  tags:         string[];
  views:        number;
  active:       boolean;
  client:       string;
  description?: string;
  pinned?:      boolean;
  authorUid?:   string;
}

export interface MarketItem {
  id:          string;
  name:        string;
  emoji:       string;
  price:       number;
  condition:   'new' | 'like-new' | 'good' | 'used';
  city:        string;
  seller:      string;
  description: string;
  featured?:   boolean;
  imageURL?:   string;
  authorUid?:  string;
  sold?:       boolean;
}

export interface FunCard {
  id:         string;
  author:     string;
  role:       string;
  emoji:      string;
  emojiTag:   string;
  title:      string;
  text:       string;
  reactions:  { laugh: number; heart: number; clap: number };
  comments:   number;
  time:       string;
  authorUid?: string;
}

export interface VideoItem {
  id:         string;
  name:       string;
  emoji:      string;
  instrument: string;
  city:       string;
  rating:     string;
  duration:   string;
  views:      number;      // number for Firestore orderBy; display via formatViews()
  badge?:     'new' | 'top';
  videoURL?:  string;
  uid?:       string;
}

export interface ChatItem {
  id:           string;
  name:         string;
  emoji:        string;
  preview:      string;
  time:         string;
  unread?:      number;
  online?:      boolean;
  isGroup?:     boolean;
  members?:     string[];
  initiatorUid?: string;  // who started the chat
}

export interface Message {
  id:        string;
  text:      string;
  mine:      boolean;
  time:      string;
  senderId?: string;
}

export type Lang = 'az' | 'ru';

export interface Invite {
  id:              string;
  musicianId:      string;   // uid or seed id of the musician
  musicianName:    string;
  musicianEmoji:   string;
  musicianInst:    string;
  fromUid:         string;   // who sent the invite
  fromName:        string;
  fromCity?:       string;
  status:          'pending' | 'accepted' | 'declined';
  createdAt:       any;      // Firestore Timestamp
  createdAtStr?:   string;   // formatted for display
}

export interface Agreement {
  id:         string;
  fromUid:    string;   // who initiated chat
  fromName:   string;
  toUid:      string;   // who agreed
  toName:     string;
  status:     'agreed' | 'cancelled';
  cancelledBy?: string;
  createdAt:  any;
}
