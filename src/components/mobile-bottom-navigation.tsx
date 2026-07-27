import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/fixed-text';
import { Colors, Shadows } from '@/constants/brand';
import {
  subscribeInAppNotifications,
  type InAppNotification,
} from '@/services/in-app-notifications';

type TabName = 'home' | 'explore' | 'saved' | 'notifications' | 'account';

const tabs: { name: TabName; label: string; href: '/' | '/explore' | '/saved' | '/notifications' | '/account' }[] = [
  { name: 'home', label: 'Trang chủ', href: '/' },
  { name: 'explore', label: 'Khám phá', href: '/explore' },
  { name: 'saved', label: 'Đã lưu', href: '/saved' },
  { name: 'notifications', label: 'Thông báo', href: '/notifications' },
  { name: 'account', label: 'Tài khoản', href: '/account' },
];

function isTabActive(name: TabName, pathname: string) {
  if (name === 'home') return pathname === '/';
  if (name === 'explore') return pathname === '/explore' || pathname.startsWith('/cases/');
  return pathname === `/${name}`;
}

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  useEffect(() => subscribeInAppNotifications(setNotifications), []);

  if (Platform.OS === 'web') return null;

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {tabs.map((tab) => {
        const active = isTabActive(tab.name, pathname);
        return (
          <Pressable
            key={tab.name}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.replace(tab.href as Href)}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
            <View style={[styles.iconSurface, active && styles.iconSurfaceActive]}>
              <TabIcon name={tab.name} active={active} />
              {tab.name === 'notifications' && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({ name, active }: { name: TabName; active: boolean }) {
  const color = active ? Colors.primary : '#778B80';
  const surface = active ? Colors.primarySoft : Colors.paper;
  if (name === 'home') {
    return <View style={styles.icon}><View style={[styles.homeRoof, { borderColor: color }]} /><View style={[styles.homeBody, { borderColor: color }]} /><View style={[styles.homeDoor, { backgroundColor: color }]} /></View>;
  }
  if (name === 'explore') {
    return <View style={[styles.compass, { borderColor: color }]}><View style={[styles.compassNeedle, { backgroundColor: color }]} /><View style={[styles.compassCenter, { backgroundColor: surface, borderColor: color }]} /></View>;
  }
  if (name === 'saved') {
    return <View style={[styles.bookmark, { borderColor: color }]}><View style={[styles.bookmarkCut, { backgroundColor: surface, borderColor: color }]} /></View>;
  }
  if (name === 'notifications') {
    return <View style={styles.icon}><View style={[styles.bellBody, { borderColor: color }]} /><View style={[styles.bellBase, { backgroundColor: color }]} /><View style={[styles.bellClapper, { backgroundColor: color }]} /></View>;
  }
  return <View style={styles.icon}><View style={[styles.accountHead, { borderColor: color }]} /><View style={[styles.accountShoulders, { borderColor: color }]} /></View>;
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.paper,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingTop: 7,
    paddingHorizontal: 4,
    ...Shadows.card,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemPressed: { opacity: 0.62 },
  iconSurface: {
    width: 40,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSurfaceActive: { backgroundColor: Colors.primarySoft },
  label: { color: '#778B80', fontSize: 9, fontWeight: '800' },
  labelActive: { color: Colors.primaryDark },
  icon: { width: 27, height: 25, alignItems: 'center', justifyContent: 'center' },
  homeRoof: {
    position: 'absolute',
    top: 2,
    width: 15,
    height: 15,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  homeBody: {
    position: 'absolute',
    bottom: 1,
    width: 19,
    height: 15,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  homeDoor: { position: 'absolute', bottom: 2, width: 5, height: 8, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  compass: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  compassNeedle: { width: 5, height: 15, borderRadius: 4, transform: [{ rotate: '36deg' }] },
  compassCenter: { position: 'absolute', width: 6, height: 6, borderRadius: 3, borderWidth: 1.5 },
  bookmark: { width: 17, height: 23, borderWidth: 2, borderRadius: 4, overflow: 'hidden' },
  bookmarkCut: { position: 'absolute', bottom: -6, left: 3, width: 8, height: 8, borderLeftWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }] },
  bellBody: { position: 'absolute', top: 3, width: 18, height: 17, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  bellBase: { position: 'absolute', bottom: 4, width: 22, height: 2, borderRadius: 1 },
  bellClapper: { position: 'absolute', bottom: 0, width: 6, height: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  accountHead: { position: 'absolute', top: 1, width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  accountShoulders: { position: 'absolute', bottom: 1, width: 22, height: 12, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  badge: { position: 'absolute', right: -2, top: -4, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.red, borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
});
