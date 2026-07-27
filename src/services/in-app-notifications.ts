import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { auth, db } from '@/services/firebase';

export type InAppNotification = {
  id: string;
  type: 'new_case' | 'case_updated' | 'balance';
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  caseId?: string;
};

function notificationsCollection(uid: string) {
  return collection(db, 'users', uid, 'notifications');
}

function timestampMillis(value: unknown) {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value && typeof value === 'object' && 'seconds' in value) {
    return Number(value.seconds) * 1000;
  }
  return Date.now();
}

function toNotification(snapshot: QueryDocumentSnapshot<DocumentData>): InAppNotification {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    type: data.type === 'balance' ? 'balance' : data.type === 'new_case' ? 'new_case' : 'case_updated',
    title: String(data.title ?? 'Thông báo'),
    body: String(data.body ?? ''),
    createdAt: timestampMillis(data.createdAt),
    read: Boolean(data.read),
    caseId: data.caseId ? String(data.caseId) : undefined,
  };
}

export function subscribeInAppNotifications(listener: (items: InAppNotification[]) => void) {
  let stopNotifications: () => void = () => undefined;

  const stopAuth = onAuthStateChanged(auth, (user) => {
    stopNotifications();
    stopNotifications = () => undefined;

    if (!user) {
      listener([]);
      return;
    }

    const notificationsQuery = query(
      notificationsCollection(user.uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    stopNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      listener(snapshot.docs.map(toNotification));
    }, () => listener([]));
  });

  return () => {
    stopAuth();
    stopNotifications();
  };
}

async function updateNotificationDocuments(mode: 'read' | 'delete') {
  const user = auth.currentUser;
  if (!user) return;

  const snapshot = await getDocs(notificationsCollection(user.uid));
  const documents = mode === 'read'
    ? snapshot.docs.filter((item) => !Boolean(item.data().read))
    : snapshot.docs;

  for (let index = 0; index < documents.length; index += 400) {
    const batch = writeBatch(db);
    documents.slice(index, index + 400).forEach((item) => {
      if (mode === 'delete') batch.delete(item.ref);
      else batch.update(item.ref, { read: true });
    });
    await batch.commit();
  }
}

export async function markAllNotificationsRead() {
  await updateNotificationDocuments('read');
}

export async function deleteAllNotifications() {
  await updateNotificationDocuments('delete');
}
