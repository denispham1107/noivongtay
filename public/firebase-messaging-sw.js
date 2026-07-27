/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();
const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');

function sitePath(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${scopePath}${normalizedPath}`;
}

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Nối Vòng Tay';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: sitePath('/favicon.ico'),
    badge: sitePath('/favicon.ico'),
    data: { path: payload.data?.path || '/notifications' },
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(
    sitePath(event.notification.data?.path || '/notifications'),
    self.location.origin,
  ).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(destination);
        return existing.focus();
      }
      return clients.openWindow(destination);
    }),
  );
});
