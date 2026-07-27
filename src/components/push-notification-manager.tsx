import { router, type Href } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { auth } from '@/services/firebase';
import {
  restorePushNotifications,
  subscribeForegroundPush,
  subscribePushResponses,
} from '@/services/push-notifications';

export function PushNotificationManager() {
  useEffect(() => {
    const stopAuth = onAuthStateChanged(auth, (user) => {
      if (user) void restorePushNotifications().catch(() => undefined);
    });
    const stopForeground = subscribeForegroundPush();
    const stopResponses = subscribePushResponses((path) => router.push(path as Href));
    return () => {
      stopAuth();
      stopForeground();
      stopResponses();
    };
  }, []);

  return null;
}
