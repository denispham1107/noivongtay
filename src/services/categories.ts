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

import { categories as defaultCategoryNames } from '@/data/cases';
import { auth, db, isFirebaseConfigured } from './firebase';

export type CaseCategory = {
  id: string;
  name: string;
};

export const defaultCaseCategories: CaseCategory[] = defaultCategoryNames
  .filter((name) => name !== 'Tất cả')
  .map((name, index) => ({ id: `default-${index + 1}`, name }));

function normalizeCategories(value: unknown): CaseCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim() }))
    .filter((item) => item.id && item.name);
}

export async function getCaseCategories(): Promise<CaseCategory[]> {
  if (!isFirebaseConfigured) return defaultCaseCategories;
  const snapshot = await getDoc(doc(db, 'settings', 'categories'));
  const stored = snapshot.exists() ? normalizeCategories(snapshot.data().items) : [];
  return stored.length ? stored : defaultCaseCategories;
}

async function requireCategoryManager() {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  const token = await user.getIdTokenResult();
  if (!['super_admin', 'admin', 'editor', 'moderator'].includes(String(token.claims.role))) {
    throw new Error('Tài khoản không có quyền quản lý danh mục.');
  }
  return user;
}

export async function saveCaseCategories(items: CaseCategory[], renamed?: { from: string; to: string }) {
  const user = await requireCategoryManager();
  const normalized = items.map((item) => ({ id: item.id, name: item.name.trim() }));
  if (!normalized.length) throw new Error('Hệ thống phải có ít nhất một danh mục.');
  if (normalized.some((item) => item.name.length < 2 || item.name.length > 40)) throw new Error('Tên danh mục phải có từ 2 đến 40 ký tự.');
  if (new Set(normalized.map((item) => item.name.toLocaleLowerCase('vi'))).size !== normalized.length) throw new Error('Tên danh mục không được trùng nhau.');

  if (!renamed || renamed.from === renamed.to) {
    await setDoc(doc(db, 'settings', 'categories'), { items: normalized, updatedAt: serverTimestamp(), updatedBy: user.uid }, { merge: true });
    return;
  }

  const affected = await getDocs(query(collection(db, 'charityCases'), where('category', '==', renamed.from)));
  if (affected.size > 450) throw new Error('Có quá nhiều hồ sơ cần cập nhật cùng lúc.');
  const batch = writeBatch(db);
  batch.set(doc(db, 'settings', 'categories'), { items: normalized, updatedAt: serverTimestamp(), updatedBy: user.uid }, { merge: true });
  affected.docs.forEach((caseDocument) => batch.update(caseDocument.ref, { category: renamed.to, updated: 'Vừa cập nhật', updatedAt: serverTimestamp(), updatedBy: user.uid }));
  await batch.commit();
}

export function createCategoryId() {
  return `category-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
