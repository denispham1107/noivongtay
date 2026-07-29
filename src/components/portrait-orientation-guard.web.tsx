import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/fixed-text';
import { Colors } from '@/constants/brand';

type StandaloneNavigator = Navigator & { standalone?: boolean };
type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'portrait-primary') => Promise<void>;
};

function isStandaloneWebApp() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as StandaloneNavigator).standalone);
}

function shouldBlockLandscape() {
  if (typeof window === 'undefined') return false;
  return isStandaloneWebApp() && window.matchMedia('(orientation: landscape)').matches;
}

export function PortraitOrientationGuard() {
  const [blocked, setBlocked] = useState(shouldBlockLandscape);

  useEffect(() => {
    const orientationQuery = window.matchMedia('(orientation: landscape)');
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const update = () => setBlocked(shouldBlockLandscape());

    const requestPortrait = async () => {
      if (!isStandaloneWebApp()) return;
      const orientation = window.screen.orientation as LockableScreenOrientation | undefined;
      try {
        await orientation?.lock?.('portrait-primary');
      } catch {
        // iOS/iPadOS web apps do not expose a reliable orientation lock.
        // The full-screen guard below keeps the app portrait-only there.
      }
    };

    void requestPortrait();
    update();
    orientationQuery.addEventListener?.('change', update);
    displayModeQuery.addEventListener?.('change', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);

    return () => {
      orientationQuery.removeEventListener?.('change', update);
      displayModeQuery.removeEventListener?.('change', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!blocked) return null;

  return (
    <View accessibilityRole="alert" style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.phone}>
          <View style={styles.phoneScreen}><Text style={styles.heart}>♥</Text></View>
        </View>
        <Text style={styles.title}>Vui lòng xoay màn hình về chiều dọc</Text>
        <Text style={styles.description}>Nối Vòng Tay được thiết kế để sử dụng ở khổ dọc trên điện thoại.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMist,
    padding: 24,
  } as any,
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 28,
    backgroundColor: Colors.paper,
    paddingHorizontal: 28,
    paddingVertical: 30,
  },
  phone: {
    width: 70,
    height: 112,
    borderWidth: 5,
    borderColor: Colors.primaryDark,
    borderRadius: 18,
    padding: 6,
    marginBottom: 22,
  },
  phoneScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: Colors.primary,
  },
  heart: { color: Colors.coral, fontSize: 30, fontWeight: '900' },
  title: { color: Colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center' },
  description: { color: Colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 10 },
});
