import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/services/firebase';

export type PushProvider = 'expo' | 'fcm';

type PushTokenRegistration = {
  token: string;
  provider: PushProvider;
  platform: 'ios' | 'android' | 'web';
};

function storageKey(uid: string, provider: PushProvider) {
  return `@noi-vong-tay/push-token-document/${uid}/${provider}`;
}

export async function savePushToken(registration: PushTokenRegistration) {
  const user = auth.currentUser;
  if (!user) throw new Error('Cần đăng nhập trước khi đăng ký thông báo.');

  const key = storageKey(user.uid, registration.provider);
  let documentId = await AsyncStorage.getItem(key);
  if (!documentId) {
    documentId = doc(collection(db, 'users', user.uid, 'pushTokens')).id;
    await AsyncStorage.setItem(key, documentId);
  }

  await setDoc(doc(db, 'users', user.uid, 'pushTokens', documentId), {
    ...registration,
    updatedAt: serverTimestamp(),
  });
}

export async function removePushTokenForUser(uid: string, provider: PushProvider) {
  const key = storageKey(uid, provider);
  const documentId = await AsyncStorage.getItem(key);
  if (!documentId) return;
  await deleteDoc(doc(db, 'users', uid, 'pushTokens', documentId)).catch(() => undefined);
  await AsyncStorage.removeItem(key);
}

export async function removeCurrentDevicePushToken() {
  const user = auth.currentUser;
  if (!user) return;
  await Promise.all([
    removePushTokenForUser(user.uid, 'expo'),
    removePushTokenForUser(user.uid, 'fcm'),
  ]);
}
