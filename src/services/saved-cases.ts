import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '@/services/firebase';

const LEGACY_STORAGE_KEY = 'noi-vong-tay.saved-case-ids.v1';

export class SavedCaseRequiresAuthError extends Error {
  constructor() {
    super('Hãy đăng nhập để lưu hoàn cảnh vào tài khoản.');
    this.name = 'SavedCaseRequiresAuthError';
  }
}

function savedCasesCollection(uid: string) {
  return collection(db, 'users', uid, 'savedCases');
}

async function migrateLegacySavedCases(uid: string) {
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(LEGACY_STORAGE_KEY)) || '[]');
    if (!Array.isArray(stored) || !stored.length) return;
    const ids = [...new Set(stored.filter((item): item is string => typeof item === 'string' && !!item))];
    await Promise.all(ids.map((caseId) => setDoc(doc(db, 'users', uid, 'savedCases', caseId), {
      caseId,
      savedAt: serverTimestamp(),
    })));
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Dữ liệu cũ chỉ là bước di chuyển hỗ trợ; đồng bộ Firestore vẫn tiếp tục nếu bước này lỗi.
  }
}

export async function getSavedCaseIds() {
  const user = auth.currentUser;
  if (!user) return [];
  const snapshot = await getDocs(savedCasesCollection(user.uid));
  return snapshot.docs.map((item) => item.id);
}

export async function toggleSavedCase(caseId: string) {
  const user = auth.currentUser;
  if (!user) throw new SavedCaseRequiresAuthError();

  const savedRef = doc(db, 'users', user.uid, 'savedCases', caseId);
  const snapshot = await getDoc(savedRef);
  if (snapshot.exists()) {
    await deleteDoc(savedRef);
    return false;
  }

  await setDoc(savedRef, {
    caseId,
    savedAt: serverTimestamp(),
  });
  return true;
}

export function subscribeSavedCases(listener: (ids: string[]) => void) {
  let stopSavedCases: () => void = () => undefined;

  const stopAuth = onAuthStateChanged(auth, (user) => {
    stopSavedCases();
    stopSavedCases = () => undefined;

    if (!user) {
      listener([]);
      return;
    }

    void migrateLegacySavedCases(user.uid);
    stopSavedCases = onSnapshot(savedCasesCollection(user.uid), (snapshot) => {
      listener(snapshot.docs.map((item) => item.id));
    }, () => listener([]));
  });

  return () => {
    stopAuth();
    stopSavedCases();
  };
}
