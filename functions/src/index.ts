import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

function requireSuperAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth || request.auth.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Chỉ Super Admin được thực hiện thao tác này.');
  }
}

function requireAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth || !['super_admin', 'admin'].includes(String(request.auth.token.role))) {
    throw new HttpsError('permission-denied', 'Chỉ quản trị viên được thực hiện thao tác này.');
  }
}

function normalizedPhone(value: string) {
  return value.replace(/[\s.()-]/g, '');
}

const MAX_MONEY = 9_000_000_000_000;

function validMoney(value: unknown, allowZero = true) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1) || amount > MAX_MONEY) {
    throw new HttpsError('invalid-argument', 'Số tiền không hợp lệ.');
  }
  return amount;
}

async function requireRegularUser(uid: string) {
  const user = await getAuth().getUser(uid).catch(() => null);
  if (!user) throw new HttpsError('not-found', 'Không tìm thấy tài khoản người dùng.');
  const role = String(user.customClaims?.role ?? 'user');
  if (role !== 'user') throw new HttpsError('permission-denied', 'Không thể thay đổi tài khoản quản trị tại mục Người dùng.');
  return user;
}

type PushMessage = {
  title: string;
  body: string;
  path: string;
};

type StoredPushToken = {
  token: string;
  provider: 'expo' | 'fcm';
  reference: FirebaseFirestore.DocumentReference;
};

function tokenFromDocument(document: FirebaseFirestore.QueryDocumentSnapshot): StoredPushToken | null {
  const token = String(document.get('token') ?? '');
  const provider = document.get('provider');
  if (!token || !['expo', 'fcm'].includes(String(provider))) return null;
  return {
    token,
    provider: provider as StoredPushToken['provider'],
    reference: document.ref,
  };
}

async function sendExpoPush(tokens: StoredPushToken[], message: PushMessage) {
  for (let offset = 0; offset < tokens.length; offset += 100) {
    const chunk = tokens.slice(offset, offset + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk.map((item) => ({
        to: item.token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: { path: message.path },
        channelId: 'noi-vong-tay',
        priority: 'high',
      }))),
    });
    if (!response.ok) throw new Error(`Expo Push Service trả về HTTP ${response.status}.`);

    const result = await response.json() as {
      data?: Array<{ status?: string; details?: { error?: string } }>;
    };
    const invalid = chunk.filter((_, index) =>
      result.data?.[index]?.details?.error === 'DeviceNotRegistered');
    await Promise.all(invalid.map((item) => item.reference.delete().catch(() => undefined)));
  }
}

async function sendFcmWebPush(tokens: StoredPushToken[], message: PushMessage) {
  for (let offset = 0; offset < tokens.length; offset += 500) {
    const chunk = tokens.slice(offset, offset + 500);
    const result = await getMessaging().sendEachForMulticast({
      tokens: chunk.map((item) => item.token),
      data: {
        title: message.title,
        body: message.body,
        path: message.path,
      },
      webpush: {
        headers: { Urgency: 'high' },
      },
    });
    const invalid = chunk.filter((_, index) => {
      const code = result.responses[index]?.error?.code ?? '';
      return code.includes('registration-token-not-registered')
        || code.includes('invalid-registration-token');
    });
    await Promise.all(invalid.map((item) => item.reference.delete().catch(() => undefined)));
  }
}

async function sendPush(tokens: StoredPushToken[], message: PushMessage) {
  const expoTokens = tokens.filter((item) => item.provider === 'expo');
  const webTokens = tokens.filter((item) => item.provider === 'fcm');
  await Promise.all([
    expoTokens.length ? sendExpoPush(expoTokens, message) : Promise.resolve(),
    webTokens.length ? sendFcmWebPush(webTokens, message) : Promise.resolve(),
  ]);
}

async function sendPushToAllAccounts(message: PushMessage) {
  const snapshot = await getFirestore().collectionGroup('pushTokens').get();
  const tokens = snapshot.docs.map(tokenFromDocument).filter((item): item is StoredPushToken => Boolean(item));
  await sendPush(tokens, message);
}

async function sendPushToUser(uid: string, message: PushMessage) {
  const snapshot = await getFirestore().collection('users').doc(uid).collection('pushTokens').get();
  const tokens = snapshot.docs.map(tokenFromDocument).filter((item): item is StoredPushToken => Boolean(item));
  await sendPush(tokens, message);
}

async function notifyAllAccounts(
  notificationId: string,
  notification: Record<string, unknown>,
  pushMessage: PushMessage,
) {
  const db = getFirestore();
  const users = await db.collection('users').select().get();
  const writer = db.bulkWriter();
  users.docs.forEach((userDocument) => {
    writer.set(userDocument.ref.collection('notifications').doc(notificationId), notification);
  });
  await writer.close();
  await sendPushToAllAccounts(pushMessage).catch((error) => {
    console.error('Không thể gửi push notification đến tất cả tài khoản.', error);
  });
}

function caseContentChanged(before: FirebaseFirestore.DocumentData, after: FirebaseFirestore.DocumentData) {
  const fields = [
    'name',
    'location',
    'category',
    'summary',
    'story',
    'image',
    'images',
    'coverImageId',
    'priority',
    'progress',
    'supporters',
    'verified',
    'status',
  ];
  return fields.some((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));
}

export const createAccountCaseNotifications = onDocumentWritten({
  document: 'charityCases/{caseId}',
  region: 'asia-southeast1',
}, async (event) => {
  const beforeSnapshot = event.data?.before;
  const afterSnapshot = event.data?.after;
  if (!afterSnapshot?.exists) return;

  const before = beforeSnapshot?.exists ? beforeSnapshot.data() : null;
  const after = afterSnapshot.data();
  if (!after) return;
  if (after.status !== 'published') return;

  const newlyPublished = !before || before.status !== 'published';
  if (!newlyPublished && !caseContentChanged(before, after)) return;

  const caseId = event.params.caseId;
  const eventId = `case-${caseId}-${event.id}`;
  const title = newlyPublished ? 'Hoàn cảnh mới vừa được đăng' : 'Thông tin hoàn cảnh đã cập nhật';
  const body = newlyPublished
    ? `${String(after.name ?? 'Một hoàn cảnh')} · ${String(after.location ?? '')}`
    : `${String(after.name ?? 'Một hoàn cảnh')} vừa có nội dung mới.`;
  await notifyAllAccounts(eventId, {
    type: newlyPublished ? 'new_case' : 'case_updated',
    title,
    body,
    caseId,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  }, {
    title,
    body,
    path: `/cases/${caseId}`,
  });
});

export const createAdminUser = onCall({ region: 'asia-southeast1' }, async (request) => {
  requireSuperAdmin(request);
  const { email, password, displayName, role = 'editor' } = request.data as Record<string, string>;
  if (!email || !password || !displayName) throw new HttpsError('invalid-argument', 'Thiếu thông tin bắt buộc.');
  const allowedRoles = ['admin', 'editor', 'moderator'];
  if (!allowedRoles.includes(role)) throw new HttpsError('invalid-argument', 'Vai trò không hợp lệ.');

  const user = await getAuth().createUser({ email, password, displayName, disabled: false });
  await getAuth().setCustomUserClaims(user.uid, { role });
  await getFirestore().collection('users').doc(user.uid).set({ email, displayName, role, status: 'active', createdAt: FieldValue.serverTimestamp() });
  await getFirestore().collection('auditLogs').add({ action: 'user.created', targetId: user.uid, actorId: request.auth!.uid, createdAt: FieldValue.serverTimestamp() });
  return { uid: user.uid };
});

export const deleteAdminUser = onCall({ region: 'asia-southeast1' }, async (request) => {
  requireSuperAdmin(request);
  const { uid } = request.data as { uid?: string };
  if (!uid || uid === request.auth!.uid) throw new HttpsError('invalid-argument', 'Không thể xóa tài khoản này.');
  await getAuth().deleteUser(uid);
  await getFirestore().collection('users').doc(uid).delete();
  await getFirestore().collection('auditLogs').add({ action: 'user.deleted', targetId: uid, actorId: request.auth!.uid, createdAt: FieldValue.serverTimestamp() });
  return { success: true };
});

export const updateRegisteredUser = onCall({ region: 'asia-southeast1' }, async (request) => {
  requireAdmin(request);
  const { uid, fullName, phone, email } = request.data as Record<string, string>;
  const cleanName = String(fullName ?? '').trim();
  const cleanPhone = normalizedPhone(String(phone ?? ''));
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  if (!uid || cleanName.length < 2 || cleanName.length > 80) throw new HttpsError('invalid-argument', 'Họ tên không hợp lệ.');
  if (!/^(\+84|0)[0-9]{9,10}$/.test(cleanPhone)) throw new HttpsError('invalid-argument', 'Số điện thoại không hợp lệ.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new HttpsError('invalid-argument', 'Email không hợp lệ.');
  await requireRegularUser(uid);

  try {
    await getAuth().updateUser(uid, { email: cleanEmail, displayName: cleanName });
  } catch (reason) {
    const code = typeof reason === 'object' && reason && 'code' in reason ? String(reason.code) : '';
    if (code.includes('email-already-exists')) throw new HttpsError('already-exists', 'Email này đã được tài khoản khác sử dụng.');
    throw new HttpsError('internal', 'Không thể cập nhật tài khoản Authentication.');
  }

  await getFirestore().collection('users').doc(uid).set({ fullName: cleanName, displayName: cleanName, phone: cleanPhone, email: cleanEmail, updatedAt: FieldValue.serverTimestamp(), updatedBy: request.auth!.uid }, { merge: true });
  await getFirestore().collection('auditLogs').add({ action: 'registered_user.updated', targetId: uid, actorId: request.auth!.uid, createdAt: FieldValue.serverTimestamp() });
  return { success: true };
});

export const adjustUserBalance = onCall({ region: 'asia-southeast1' }, async (request) => {
  requireAdmin(request);
  const { uid } = request.data as { uid?: string };
  const balance = validMoney((request.data as { balance?: unknown }).balance);
  if (!uid) throw new HttpsError('invalid-argument', 'Thiếu UID người dùng.');
  await requireRegularUser(uid);

  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const auditRef = db.collection('auditLogs').doc();
  const notificationRef = userRef.collection('notifications').doc();
  let balanceIncrease = 0;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Không tìm thấy hồ sơ người dùng.');
    const previousBalance = Number(snapshot.get('balance') ?? 0);
    transaction.set(userRef, {
      balance,
      balanceUpdatedAt: FieldValue.serverTimestamp(),
      balanceUpdatedBy: request.auth!.uid,
    }, { merge: true });
    transaction.set(auditRef, {
      action: 'registered_user.balance_adjusted',
      targetId: uid,
      actorId: request.auth!.uid,
      previousBalance,
      balance,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (balance > previousBalance) {
      balanceIncrease = balance - previousBalance;
      transaction.set(notificationRef, {
        type: 'balance',
        title: 'Tài khoản vừa được nạp tiền',
        body: `Tài khoản của bạn đã được cộng thêm ${balanceIncrease.toLocaleString('en-US')}đ.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
  if (balanceIncrease > 0) {
    await sendPushToUser(uid, {
      title: 'Tài khoản vừa được nạp tiền',
      body: `Tài khoản của bạn đã được cộng thêm ${balanceIncrease.toLocaleString('en-US')}đ.`,
      path: '/account',
    }).catch((error) => {
      console.error(`Không thể gửi push notification đến tài khoản ${uid}.`, error);
    });
  }
  return { balance };
});

export const supportCharityCase = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Hãy đăng nhập để hỗ trợ hồ sơ.');
  const { caseId } = request.data as { caseId?: string };
  const amount = validMoney((request.data as { amount?: unknown }).amount, false);
  if (!caseId) throw new HttpsError('invalid-argument', 'Thiếu mã hồ sơ.');

  const db = getFirestore();
  const userRef = db.collection('users').doc(request.auth.uid);
  const caseRef = db.collection('charityCases').doc(caseId);
  const supportRef = caseRef.collection('supportTransactions').doc();
  let nextBalance = 0;
  let nextReceivedAmount = 0;

  await db.runTransaction(async (transaction) => {
    const [userSnapshot, caseSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(caseRef),
    ]);
    if (!userSnapshot.exists || userSnapshot.get('role') !== 'user') {
      throw new HttpsError('permission-denied', 'Chỉ tài khoản người dùng được chuyển tiền hỗ trợ.');
    }
    if (userSnapshot.get('status') === 'disabled') {
      throw new HttpsError('permission-denied', 'Tài khoản hiện đang bị khóa.');
    }
    if (!caseSnapshot.exists || caseSnapshot.get('status') !== 'published') {
      throw new HttpsError('not-found', 'Hồ sơ không tồn tại hoặc chưa được công khai.');
    }

    const currentBalance = Number(userSnapshot.get('balance') ?? 0);
    const currentReceivedAmount = Number(caseSnapshot.get('receivedAmount') ?? 0);
    if (!Number.isSafeInteger(currentBalance) || currentBalance < amount) {
      throw new HttpsError('failed-precondition', 'Số dư không đủ để thực hiện hỗ trợ.');
    }

    nextBalance = currentBalance - amount;
    nextReceivedAmount = currentReceivedAmount + amount;
    if (!Number.isSafeInteger(nextReceivedAmount) || nextReceivedAmount > MAX_MONEY) {
      throw new HttpsError('out-of-range', 'Tổng số tiền của hồ sơ vượt giới hạn cho phép.');
    }

    const userName = String(userSnapshot.get('fullName') ?? userSnapshot.get('displayName') ?? 'Người dùng');
    transaction.update(userRef, {
      balance: nextBalance,
      balanceUpdatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(caseRef, {
      receivedAmount: nextReceivedAmount,
      lastSupportAt: FieldValue.serverTimestamp(),
    });
    transaction.set(supportRef, {
      caseId,
      userId: request.auth!.uid,
      userName,
      amount,
      type: 'user_support',
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { balance: nextBalance, receivedAmount: nextReceivedAmount };
});

export const adjustCaseReceivedAmount = onCall({ region: 'asia-southeast1' }, async (request) => {
  requireAdmin(request);
  const { caseId } = request.data as { caseId?: string };
  const receivedAmount = validMoney((request.data as { receivedAmount?: unknown }).receivedAmount);
  if (!caseId) throw new HttpsError('invalid-argument', 'Thiếu mã hồ sơ.');

  const db = getFirestore();
  const caseRef = db.collection('charityCases').doc(caseId);
  const adjustmentRef = caseRef.collection('supportTransactions').doc();
  const auditRef = db.collection('auditLogs').doc();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(caseRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Không tìm thấy hồ sơ.');
    const previousAmount = Number(snapshot.get('receivedAmount') ?? 0);
    const difference = receivedAmount - previousAmount;
    transaction.update(caseRef, {
      receivedAmount,
      supportAmountUpdatedAt: FieldValue.serverTimestamp(),
      supportAmountUpdatedBy: request.auth!.uid,
    });
    if (difference !== 0) {
      transaction.set(adjustmentRef, {
        caseId,
        userId: request.auth!.uid,
        userName: 'Quản trị viên',
        amount: difference,
        type: 'admin_adjustment',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.set(auditRef, {
      action: 'charity_case.received_amount_adjusted',
      targetId: caseId,
      actorId: request.auth!.uid,
      previousAmount,
      receivedAmount,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { receivedAmount };
});

export const deleteRegisteredUser = onCall({ region: 'asia-southeast1' }, async (request) => {
  requireAdmin(request);
  const { uid } = request.data as { uid?: string };
  if (!uid || uid === request.auth!.uid) throw new HttpsError('invalid-argument', 'Không thể xóa tài khoản này.');
  await requireRegularUser(uid);
  await getAuth().deleteUser(uid);
  await getFirestore().collection('users').doc(uid).delete();
  await getFirestore().collection('auditLogs').add({ action: 'registered_user.deleted', targetId: uid, actorId: request.auth!.uid, createdAt: FieldValue.serverTimestamp() });
  return { success: true };
});
