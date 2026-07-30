import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, type DocumentData } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { auth, db, functions } from './firebase';
import { removeCurrentDevicePushToken } from './push-token-registry';

export type AppUser = {
  uid: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  status: 'active' | 'disabled';
  balance: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[\s.()-]/g, '');
}

export function validateRegistration(input: RegisterInput) {
  if (input.fullName.trim().length < 2 || input.fullName.trim().length > 80) return 'Họ tên phải có từ 2 đến 80 ký tự.';
  if (!/^(\+84|0)[0-9]{9,10}$/.test(normalizePhone(input.phone))) return 'Số điện thoại chưa đúng định dạng Việt Nam.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Email chưa đúng định dạng.';
  if (input.password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  return '';
}

export async function registerUser(input: RegisterInput) {
  const validationError = validateRegistration(input);
  if (validationError) throw new Error(validationError);

  let createdUser: User | null = null;
  try {
    const credential = await createUserWithEmailAndPassword(auth, input.email.trim().toLowerCase(), input.password);
    createdUser = credential.user;
    await updateProfile(createdUser, { displayName: input.fullName.trim() });
    await setDoc(doc(db, 'users', createdUser.uid), {
      fullName: input.fullName.trim(),
      displayName: input.fullName.trim(),
      phone: normalizePhone(input.phone),
      email: input.email.trim().toLowerCase(),
      role: 'user',
      status: 'active',
      balance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return createdUser;
  } catch (reason) {
    if (createdUser) await deleteUser(createdUser).catch(() => undefined);
    throw reason;
  }
}

export async function loginUser(email: string, password: string) {
  return (await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)).user;
}

export async function logoutUser() {
  await removeCurrentDevicePushToken();
  await signOut(auth);
}

function toAppUser(uid: string, data: DocumentData): AppUser {
  return {
    uid,
    fullName: data.fullName ?? data.displayName ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
    role: data.role ?? 'user',
    status: data.status === 'disabled' ? 'disabled' : 'active',
    balance: Number(data.balance ?? 0),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getCurrentUserProfile(uid: string) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? toAppUser(snapshot.id, snapshot.data()) : null;
}

export function subscribeUserProfile(uid: string, listener: (profile: AppUser | null) => void) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => listener(snapshot.exists() ? toAppUser(snapshot.id, snapshot.data()) : null),
    () => listener(null),
  );
}

export async function getRegisteredUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((item) => toAppUser(item.id, item.data())).filter((item) => item.role === 'user');
}

export async function updateRegisteredUser(uid: string, input: Pick<AppUser, 'fullName' | 'phone' | 'email'>) {
  const call = httpsCallable<typeof input & { uid: string }, { success: boolean }>(functions, 'updateRegisteredUser');
  await call({ uid, fullName: input.fullName.trim(), phone: normalizePhone(input.phone), email: input.email.trim().toLowerCase() });
}

export async function deleteRegisteredUser(uid: string) {
  const call = httpsCallable<{ uid: string }, { success: boolean }>(functions, 'deleteRegisteredUser');
  await call({ uid });
}
