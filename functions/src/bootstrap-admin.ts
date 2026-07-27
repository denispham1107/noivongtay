import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function getArgument(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function projectFromFirebaseRc() {
  const candidates = [resolve(process.cwd(), '.firebaserc'), resolve(process.cwd(), '..', '.firebaserc')];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const contents = JSON.parse(readFileSync(file, 'utf8')) as { projects?: { default?: string } };
    if (contents.projects?.default) return contents.projects.default;
  }

  return undefined;
}

async function bootstrap() {
  if (process.argv.includes('--help')) {
    console.log('Cách dùng: npm.cmd run bootstrap-admin -- --uid="FIREBASE_AUTH_UID" [--project="PROJECT_ID"]');
    return;
  }

  const uid = getArgument('uid');
  if (!uid) throw new Error('Thiếu UID. Hãy thêm --uid="UID_CUA_ADMIN".');

  const projectId =
    getArgument('project') ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    projectFromFirebaseRc();

  if (!projectId) throw new Error('Không xác định được Firebase Project ID. Hãy thêm --project="noi-vong-tay".');

  initializeApp({ credential: applicationDefault(), projectId });

  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUser(uid);
  const lockRef = db.collection('system').doc('bootstrapAdmin');
  const userRef = db.collection('users').doc(uid);
  const auditRef = db.collection('auditLogs').doc('bootstrap-super-admin');

  const [lockSnapshot, existingAdmins, userSnapshot] = await Promise.all([
    lockRef.get(),
    db.collection('users').where('role', '==', 'super_admin').limit(1).get(),
    userRef.get(),
  ]);

  const lockedUid = lockSnapshot.get('uid') as string | undefined;
  if (lockedUid && lockedUid !== uid) {
    throw new Error(`Hệ thống đã được khởi tạo bởi Super Admin UID ${lockedUid}. Script từ chối ghi đè.`);
  }

  const differentAdmin = existingAdmins.docs.find((document) => document.id !== uid);
  if (differentAdmin) {
    throw new Error(`Đã tồn tại Super Admin UID ${differentAdmin.id}. Script từ chối tạo Super Admin thứ hai.`);
  }

  const alreadyComplete =
    lockSnapshot.get('status') === 'completed' &&
    user.customClaims?.role === 'super_admin' &&
    userSnapshot.get('role') === 'super_admin';

  if (alreadyComplete) {
    console.log(`Super Admin ${user.email ?? uid} đã được khởi tạo trước đó. Không có dữ liệu nào bị ghi đè.`);
    return;
  }

  await db.runTransaction(async (transaction) => {
    const currentLock = await transaction.get(lockRef);
    const currentUid = currentLock.get('uid') as string | undefined;
    if (currentUid && currentUid !== uid) throw new Error('Một Super Admin khác đã giữ khóa khởi tạo.');

    transaction.set(
      lockRef,
      {
        uid,
        status: 'pending',
        startedAt: currentLock.exists ? currentLock.get('startedAt') : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await auth.setCustomUserClaims(uid, { ...user.customClaims, role: 'super_admin' });

  const batch = db.batch();
  batch.set(
    userRef,
    {
      email: user.email ?? null,
      displayName: user.displayName ?? user.email ?? 'Super Admin',
      role: 'super_admin',
      status: 'active',
      ...(userSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    auditRef,
    {
      action: 'system.super_admin.bootstrapped',
      targetId: uid,
      actorId: uid,
      source: 'bootstrap-admin',
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
  batch.set(
    lockRef,
    {
      uid,
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  console.log(`Đã khởi tạo Super Admin: ${user.email ?? uid}`);
  console.log('Hãy đăng xuất rồi đăng nhập lại để nhận token có role=super_admin.');
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Bootstrap thất bại: ${message}`);
  process.exitCode = 1;
});
