// src/firebase/auth.ts — Firebase JS SDK v11
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged as _onAuthStateChanged,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  doc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { fbAuth, fbFirestore, COLLECTIONS } from './config';

export type AuthUser = User;

// ── Register ──────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  instrument: string,
  city: string,
): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(fbAuth, email, password);
  await updateProfile(cred.user, { displayName });

  const userData = {
    uid:         cred.user.uid,
    displayName,
    email,
    instrument,
    city,
    emoji:       '🎵',
    rating:      0,
    reviews:     0,
    available:   false,
    verified:    false,
    followers:   0,
    gigs:        0,
    bio:         '',
    fcmToken:    '',
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  };

  // Save to users collection only
  await setDoc(doc(fbFirestore, COLLECTIONS.USERS, cred.user.uid), userData);

  return cred;
}

// ── Login ─────────────────────────────────────────────────
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(fbAuth, email, password);
}

// ── Logout ────────────────────────────────────────────────
export async function logout(): Promise<void> {
  return signOut(fbAuth);
}

// ── Reset password ────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(fbAuth, email);
}

// ── Auth state listener ───────────────────────────────────
export function onAuthStateChanged(
  callback: (user: User | null) => void,
): () => void {
  return _onAuthStateChanged(fbAuth, callback);
}

// ── Get current user ──────────────────────────────────────
export function getCurrentUser(): User | null {
  return fbAuth.currentUser;
}

// ── Update profile in Firestore ───────────────────────────
export async function updateUserProfile(
  uid: string,
  data: Partial<{
    displayName: string;
    bio: string;
    instrument: string;
    city: string;
    emoji: string;
    available: boolean;
    fcmToken: string;
    photoURL: string;
    phone: string;
  }>,
): Promise<void> {
  await updateDoc(doc(fbFirestore, COLLECTIONS.USERS, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  if (data.displayName && fbAuth.currentUser) {
    await updateProfile(fbAuth.currentUser, { displayName: data.displayName });
  }
}

// ── Phone Auth ────────────────────────────────────────────
import {
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
} from 'firebase/auth';

// Store verificationId between steps (module-level, not store — simpler)
let _verificationId: string = '';

// Step 1 — send SMS
// NOTE: RecaptchaVerifier needs a DOM element — in React Native we use
// signInWithPhoneNumber via a workaround through expo-firebase-recaptcha
// Since we're pure JS SDK without native modules, we use a simplified
// approach: we export helpers that the screen uses with expo-firebase-recaptcha
export async function sendPhoneOTP(
  phone: string,           // e.g. "+994501234567"
  recaptchaToken: string,  // from expo-firebase-recaptcha
): Promise<void> {
  const provider = new PhoneAuthProvider(fbAuth);
  _verificationId = await provider.verifyPhoneNumber(
    phone,
    recaptchaToken as any,
  );
}

// Step 2 — verify OTP and sign in
export async function verifyPhoneOTP(code: string): Promise<UserCredential> {
  if (!_verificationId) throw new Error('Əvvəlcə SMS kodu göndərin');
  const credential = PhoneAuthProvider.credential(_verificationId, code);
  const cred = await signInWithCredential(fbAuth, credential);

  // Save user doc if new
  const userRef = doc(fbFirestore, COLLECTIONS.USERS, cred.user.uid);
  await setDoc(userRef, {
    uid:         cred.user.uid,
    displayName: cred.user.displayName ?? 'Musiqiçi',
    phone:       cred.user.phoneNumber ?? '',
    email:       '',
    instrument:  '',
    city:        '',
    emoji:       '🎵',
    rating:      0, reviews: 0,
    available:   false, verified: false,
    followers:   0, gigs: 0, bio: '',
    fcmToken:    '',
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  }, { merge: true }); // merge:true — don't overwrite existing profile

  return cred;
}
