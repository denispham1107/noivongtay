import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { BrandedLoader } from '@/components/branded-loader';
import { MobileBottomNavigation } from '@/components/mobile-bottom-navigation';
import { PushNotificationManager } from '@/components/push-notification-manager';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return <BrandedLoader />;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F7FCF9' },
          animation: 'fade',
        }}
      />
      <PushNotificationManager />
      {Platform.OS !== 'web' && <MobileBottomNavigation />}
    </View>
  );
}
