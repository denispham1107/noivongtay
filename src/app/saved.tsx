import { router } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaseCard } from '@/components/case-card';
import { Text } from '@/components/fixed-text';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { PublicHeader } from '@/components/public-header';
import { Colors } from '@/constants/brand';
import { useCasePriorities } from '@/hooks/use-case-priorities';
import { usePublishedCases } from '@/hooks/use-published-cases';
import { sortCasesByPriority } from '@/services/priorities';
import { subscribeSavedCases } from '@/services/saved-cases';
import { auth } from '@/services/firebase';

export default function SavedScreen() {
  const { width } = useWindowDimensions();
  const { cases, loading, error } = usePublishedCases();
  const { priorities } = useCasePriorities();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => subscribeSavedCases(setSavedIds), []);
  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setCheckingUser(false);
  }), []);

  const savedCases = useMemo(
    () => sortCasesByPriority(cases.filter((item) => savedIds.includes(item.id)), priorities),
    [cases, priorities, savedIds],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PublicHeader />
      <KeyboardAwareScrollView contentContainerStyle={styles.page}>
        <View style={styles.headingMark}><View style={styles.ribbon} /><Text style={styles.eyebrow}>BỘ SƯU TẬP CỦA BẠN</Text></View>
        <Text style={styles.title}>Những câu chuyện bạn đã lưu</Text>
        <Text style={styles.subtitle}>Các hoàn cảnh được lưu trên thiết bị này để bạn dễ dàng quay lại xem sau.</Text>
        <Text style={styles.count}>{loading || checkingUser ? 'Đang tải dữ liệu…' : `${savedCases.length} hoàn cảnh đã lưu`}</Text>
        {!!error && <Text style={styles.error}>Không thể tải dữ liệu: {error}</Text>}
        {!checkingUser && !user ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><View style={styles.emptyRibbon} /></View>
            <Text style={styles.emptyTitle}>Đăng nhập để xem hồ sơ đã lưu</Text>
            <Text style={styles.emptyText}>Danh sách sẽ được đồng bộ theo tài khoản của bạn trên iOS, Android và các thiết bị khác.</Text>
            <Pressable onPress={() => router.push('/account')} style={styles.loginButton}><Text style={styles.loginButtonText}>Đăng nhập tài khoản</Text></Pressable>
          </View>
        ) : !loading && !error && savedCases.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><View style={styles.emptyRibbon} /></View>
            <Text style={styles.emptyTitle}>Chưa có hoàn cảnh nào được lưu</Text>
            <Text style={styles.emptyText}>Mở một hồ sơ và chọn “Lưu để xem sau”; hồ sơ đó sẽ xuất hiện tại đây.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {savedCases.map((item) => (
              <View key={item.id} style={{ width: width >= 1000 ? '31.8%' : width >= 620 ? '48%' : '100%' }}>
                <CaseCard item={item} priorityOption={priorities.find((entry) => entry.name === item.priority)} />
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 42, paddingBottom: 60 },
  headingMark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ribbon: { width: 9, height: 14, borderWidth: 2, borderColor: Colors.pink, borderRadius: 2 },
  eyebrow: { color: Colors.pink, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: Colors.ink, fontSize: 34, lineHeight: 42, fontWeight: '900', textAlign: 'center', marginTop: 10 },
  subtitle: { color: Colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  count: { color: Colors.muted, fontSize: 11, marginTop: 38, marginBottom: 16 },
  error: { color: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 12, padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  empty: { alignSelf: 'center', maxWidth: 520, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderRadius: 22, padding: 34 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  emptyRibbon: { width: 18, height: 27, borderWidth: 2, borderColor: Colors.pink, borderRadius: 4 },
  emptyTitle: { color: Colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 16 },
  emptyText: { color: Colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, marginTop: 18 },
  loginButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
