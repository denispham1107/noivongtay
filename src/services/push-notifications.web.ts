import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

import { firebaseApp } from '@/services/firebase';
import { savePushToken } from '@/services/push-token-registry';

export type PushPermissionState = 'checking' | 'unsupported' | 'denied' | 'enabled';

const siteBaseUrl = (process.env.EXPO_PUBLIC_SITE_BASE_URL ?? '').replace(/\/$/, '');

function sitePath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteBaseUrl}${normalizedPath}`;
}

function firebaseConfigQuery() {
  const values = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
  return new URLSearchParams(values).toString();
}

export async function ensureWebAppServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register(
    `${sitePath('/firebase-messaging-sw.js')}?${firebaseConfigQuery()}`,
  );
}

function isStandaloneWebApp() {
  if (typeof window === 'undefined') return false;
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches
    || standaloneNavigator.standalone === true;
}

export function getPushSetupHint() {
  if (typeof navigator === 'undefined') return null;
  const navigatorWithTouch = navigator as Navigator & { maxTouchPoints?: number };
  const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && (navigatorWithTouch.maxTouchPoints ?? 0) > 1);
  if (appleMobile && !isStandaloneWebApp()) {
    return 'Trên iPhone/iPad, hãy chọn Chia sẻ → Thêm vào Màn hình chính, mở Nối Vòng Tay từ biểu tượng vừa tạo rồi nhấn “Bật thông báo”.';
  }
  return null;
}

async function registerWebPush(permissionCanPrompt: boolean): Promise<PushPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  if (!(await isSupported())) return 'unsupported';

  let permission = Notification.permission;
  if (permission === 'default' && permissionCanPrompt) {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return 'denied';

  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return 'unsupported';

  const registration = await ensureWebAppServiceWorker();
  if (!registration) return 'unsupported';
  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return 'denied';

  await savePushToken({ token, provider: 'fcm', platform: 'web' });
  return 'enabled';
}

export async function registerPushNotifications() {
  return registerWebPush(true);
}

export async function restorePushNotifications() {
  return registerWebPush(false);
}

export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window) || !(await isSupported())) {
    return 'unsupported';
  }
  if (!process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY) return 'unsupported';
  return Notification.permission === 'granted' ? 'enabled' : 'denied';
}

export function subscribeForegroundPush() {
  if (
    typeof window === 'undefined'
    || !('Notification' in window)
    || !('serviceWorker' in navigator)
    || Notification.permission !== 'granted'
  ) {
    return () => undefined;
  }

  try {
    return onMessage(getMessaging(firebaseApp), (message) => {
      const title = message.notification?.title ?? message.data?.title ?? 'Nối Vòng Tay';
      const body = message.notification?.body ?? message.data?.body ?? '';
      const notification = new Notification(title, {
        body,
        icon: sitePath('/pwa-icon-192.png'),
        badge: sitePath('/pwa-icon-192.png'),
        data: { path: message.data?.path ?? '/notifications' },
      });
      notification.onclick = () => {
        window.focus();
        window.location.assign(sitePath(String(notification.data?.path ?? '/notifications')));
        notification.close();
      };
    });
  } catch {
    // Web push is an optional enhancement. Unsupported Safari/WebKit modes
    // must never prevent the rest of the website from rendering.
    return () => undefined;
  }
}

export function subscribePushResponses(_listener: (path: string) => void) {
  return () => undefined;
}

export async function deleteWebPushToken() {
  if (
    typeof window === 'undefined'
    || !('Notification' in window)
    || !('serviceWorker' in navigator)
  ) {
    return;
  }
  if (await isSupported()) await deleteToken(getMessaging(firebaseApp)).catch(() => undefined);
}
