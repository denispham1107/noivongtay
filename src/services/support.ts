import { collection, getDocs, limit, orderBy, query, type DocumentData } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from './firebase';

export type SupportTransaction = {
  id: string;
  caseId: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'user_support' | 'admin_adjustment';
  createdAt?: unknown;
};

function toSupportTransaction(id: string, data: DocumentData): SupportTransaction {
  return {
    id,
    caseId: String(data.caseId ?? ''),
    userId: String(data.userId ?? ''),
    userName: String(data.userName ?? 'Người dùng'),
    amount: Number(data.amount ?? 0),
    type: data.type === 'admin_adjustment' ? 'admin_adjustment' : 'user_support',
    createdAt: data.createdAt,
  };
}

export async function getCaseSupportHistory(caseId: string) {
  const historyQuery = query(
    collection(db, 'charityCases', caseId, 'supportTransactions'),
    orderBy('createdAt', 'desc'),
    limit(100),
  );
  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map((item) => toSupportTransaction(item.id, item.data()));
}

export async function supportCharityCase(caseId: string, amount: number) {
  const call = httpsCallable<{ caseId: string; amount: number }, { balance: number; receivedAmount: number }>(
    functions,
    'supportCharityCase',
  );
  return (await call({ caseId, amount })).data;
}

export async function adjustUserBalance(uid: string, balance: number) {
  const call = httpsCallable<{ uid: string; balance: number }, { balance: number }>(functions, 'adjustUserBalance');
  return (await call({ uid, balance })).data;
}

export async function topUpUserBalance(uid: string, amount: number) {
  const call = httpsCallable<{ uid: string; amount: number }, { balance: number }>(functions, 'topUpUserBalance');
  return (await call({ uid, amount })).data;
}

export async function adjustCaseReceivedAmount(caseId: string, receivedAmount: number) {
  const call = httpsCallable<{ caseId: string; receivedAmount: number }, { receivedAmount: number }>(
    functions,
    'adjustCaseReceivedAmount',
  );
  return (await call({ caseId, receivedAmount })).data;
}
