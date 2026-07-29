import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Colors } from '@/constants/brand';
import { Text } from '@/components/fixed-text';
import { auth } from '@/services/firebase';
import { BrandMark } from './brand-mark';

export function PublicHeader() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const compactMobile = width < 430;
  const stackedMobile = width < 360;
  const [accountName, setAccountName] = useState('');

  useEffect(() => onAuthStateChanged(auth, (user) => setAccountName(user?.displayName || user?.email || '')), []);

  return (
    <View style={styles.shell}>
      <View style={[styles.inner, compactMobile && styles.innerCompact, stackedMobile && styles.innerStacked]}>
        <Pressable style={[styles.brandButton, compactMobile && styles.brandButtonCompact, stackedMobile && styles.brandButtonStacked]} onPress={() => router.push('/')}><BrandMark compact={compactMobile} /></Pressable>
        {desktop && (
          <View style={styles.nav}>
            <NavItem label="Trang chủ" onPress={() => router.push('/')} active />
            <NavItem label="Hoàn cảnh" onPress={() => router.push('/explore')} />
            <NavItem label="Cách chúng tôi hoạt động" />
            <NavItem label="Về chúng tôi" />
          </View>
        )}
        <View style={[styles.actions, compactMobile && styles.actionsCompact, stackedMobile && styles.actionsStacked]}><Pressable style={[styles.accountButton, compactMobile && styles.actionButtonCompact, stackedMobile && styles.actionButtonStacked]} onPress={() => router.push('/account')}><Text style={[styles.accountIcon, compactMobile && styles.actionIconCompact]}>♡</Text><Text numberOfLines={1} style={[styles.accountText, compactMobile && styles.accountTextCompact]}>{accountName ? (desktop ? accountName : 'Tài khoản') : 'Đăng nhập'}</Text></Pressable><Pressable style={[styles.adminButton, compactMobile && styles.actionButtonCompact, stackedMobile && styles.actionButtonStacked]} onPress={() => router.push('/admin')}><Text style={[styles.adminIcon, compactMobile && styles.actionIconCompact]}>♙</Text><Text numberOfLines={1} style={[styles.adminText, compactMobile && styles.adminTextCompact]}>{desktop ? 'Trang quản trị' : 'Admin'}</Text></Pressable></View>
      </View>
    </View>
  );
}

function NavItem({ label, onPress, active }: { label: string; onPress?: () => void; active?: boolean }) {
  return <Pressable onPress={onPress}><Text style={[styles.navText, active && styles.navActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: 'rgba(255,255,255,0.97)', borderBottomWidth: 1, borderBottomColor: Colors.line, ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 20 } as any : {}) },
  inner: { width: '100%', maxWidth: 1180, alignSelf: 'center', minHeight: 76, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  innerCompact: { minHeight: 68, paddingHorizontal: 8, gap: 5 },
  innerStacked: { flexWrap: 'wrap', paddingVertical: 9, gap: 8 },
  brandButton: { flexShrink: 1, minWidth: 0 },
  brandButtonCompact: { flex: 1, flexBasis: 150, maxWidth: 170, overflow: 'hidden' },
  brandButtonStacked: { width: '100%', flexBasis: '100%', flexShrink: 0 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  navText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
  navActive: { color: Colors.coralDark },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  actionsCompact: { flexShrink: 1, gap: 4, minWidth: 0, maxWidth: 184 },
  actionsStacked: { width: '100%', justifyContent: 'space-between' },
  actionButtonCompact: { flexShrink: 1, minWidth: 0, paddingVertical: 9, paddingHorizontal: 7, gap: 4, overflow: 'hidden' },
  actionButtonStacked: { flex: 1, justifyContent: 'center', maxWidth: '49%' },
  actionIconCompact: { fontSize: 13 },
  accountTextCompact: { flexShrink: 1, minWidth: 0, maxWidth: 56, fontSize: 10 },
  adminTextCompact: { flexShrink: 1, minWidth: 0, maxWidth: 42, fontSize: 11 },
  accountButton: { maxWidth: 165, backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountIcon: { color: Colors.primaryDark, fontSize: 15 },
  accountText: { color: Colors.primaryDark, fontSize: 11, fontWeight: '800', maxWidth: 120 },
  adminButton: { backgroundColor: Colors.purpleSoft, borderWidth: 1, borderColor: '#DCCCF2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  adminIcon: { color: Colors.purple, fontSize: 16 },
  adminText: { color: Colors.ink, fontSize: 13, fontWeight: '700' },
});
