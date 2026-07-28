import { router, type Href } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { auth } from '@/services/firebase';
import {
  ensureWebAppServiceWorker,
  restorePushNotifications,
  subscribeForegroundPush,
  subscribePushResponses,
} from '@/services/push-notifications';

export function PushNotificationManager() {
  useEffect(() => {
    void ensureWebAppServiceWorker().catch(() => undefined);

    const stopAuth = onAuthStateChanged(auth, (user) => {
      if (user) void restorePushNotifications().catch(() => undefined);
    });
    let stopForeground: () => void = () => undefined;
    let stopResponses: () => void = () => undefined;

    try {
      stopForeground = subscribeForegroundPush();
      stopResponses = subscribePushResponses((path) => router.push(path as Href));
    } catch {
      // Notifications are optional. A browser without the necessary APIs
      // must still be able to render and use the complete application.
    }

    return () => {
      stopAuth();
      stopForeground();
      stopResponses();
    };
  }, []);

  return null;
}
