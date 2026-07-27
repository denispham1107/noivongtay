import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from './firebase';

export type CasePriority = {
  id: string;
  name: string;
  color: string;
  showFirst: boolean;
};

export const priorityColorPalette = [
  '#E5484D',
  '#F97316',
  '#EAB308',
  '#2F9B62',
  '#0EA5A8',
  '#3B82F6',
  '#7C5CE5',
  '#DB4F91',
] as const;

export const defaultCasePriorities: CasePriority[] = [
  { id: 'urgent', name: 'Khẩn cấp', color: '#E5484D', showFirst: false },
  { id: 'support', name: 'Đang cần hỗ trợ', color: '#F97316', showFirst: false },
  { id: 'stable', name: 'Ổn định', color: '#2F9B62', showFirst: false },
];

function normalizePriorities(value: unknown): CasePriority[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim(), color: String(item.color ?? '').toUpperCase(), showFirst: item.showFirst === true }))
    .filter((item) => item.id && item.name && /^#[0-9A-F]{6}$/.test(item.color));
}

export async function getCasePriorities(): Promise<CasePriority[]> {
  if (!isFirebaseConfigured) return defaultCasePriorities;
  const snapshot = await getDoc(doc(db, 'settings', 'priorities'));
  const stored = snapshot.exists() ? normalizePriorities(snapshot.data().items) : [];
  return stored.length ? stored : defaultCasePriorities;
}

async function requirePriorityManager() {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  const token = await user.getIdTokenResult();
  if (!['super_admin', 'admin', 'editor', 'moderator'].includes(String(token.claims.role))) {
    throw new Error('Tài khoản không có quyền quản lý mức độ ưu tiên.');
  }
  return user;
}

export async function saveCasePriorities(items: CasePriority[], renamed?: { from: string; to: string }) {
  const user = await requirePriorityManager();
  const normalized = items.map((item) => ({ id: item.id, name: item.name.trim(), color: item.color.toUpperCase(), showFirst: item.showFirst === true }));
  if (!normalized.length) throw new Error('Hệ thống phải có ít nhất một mức độ ưu tiên.');
  if (normalized.some((item) => item.name.length < 2 || item.name.length > 40)) throw new Error('Tên mức độ ưu tiên phải có từ 2 đến 40 ký tự.');
  if (normalized.some((item) => !/^#[0-9A-F]{6}$/.test(item.color))) throw new Error('Màu hiển thị không hợp lệ.');
  if (new Set(normalized.map((item) => item.name.toLocaleLowerCase('vi'))).size !== normalized.length) throw new Error('Tên mức độ ưu tiên không được trùng nhau.');

  if (!renamed || renamed.from === renamed.to) {
    await setDoc(doc(db, 'settings', 'priorities'), { items: normalized, updatedAt: serverTimestamp(), updatedBy: user.uid }, { merge: true });
    return;
  }

  const affected = await getDocs(query(collection(db, 'charityCases'), where('priority', '==', renamed.from)));
  if (affected.size > 450) throw new Error('Có quá nhiều hồ sơ cần cập nhật cùng lúc.');
  const batch = writeBatch(db);
  batch.set(doc(db, 'settings', 'priorities'), { items: normalized, updatedAt: serverTimestamp(), updatedBy: user.uid }, { merge: true });
  affected.docs.forEach((caseDocument) => batch.update(caseDocument.ref, { priority: renamed.to, updated: 'Vừa cập nhật', updatedAt: serverTimestamp(), updatedBy: user.uid }));
  await batch.commit();
}

export function createPriorityId() {
  return `priority-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function priorityTextColor(backgroundColor: string) {
  const hex = backgroundColor.replace('#', '');
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 160 ? '#173D2A' : '#FFFFFF';
}

export function sortCasesByPriority<T extends { priority: string }>(items: T[], priorities: CasePriority[]) {
  const pinned = new Set(priorities.filter((item) => item.showFirst).map((item) => item.name));
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => Number(pinned.has(right.item.priority)) - Number(pinned.has(left.item.priority)) || left.index - right.index)
    .map(({ item }) => item);
}
