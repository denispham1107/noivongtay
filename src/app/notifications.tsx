import { router } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/fixed-text';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { PublicHeader } from '@/components/public-header';
import { Colors } from '@/constants/brand';
import {
  deleteAllNotifications,
  markAllNotificationsRead,
  subscribeInAppNotifications,
  type InAppNotification,
} from '@/services/in-app-notifications';
import { auth } from '@/services/firebase';
import {
  getPushSetupHint,
  getPushPermissionState,
  registerPushNotifications,
  type PushPermissionState,
} from '@/services/push-notifications';

function formatNotificationTime(value: number) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  }).format(new Date(value));
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [checkingUser, setCheckingUser] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushState, setPushState] = useState<PushPermissionState>('checking');
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushSetupHint] = useState(() => getPushSetupHint());

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingUser(false);
      if (!currentUser) setItems([]);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    void getPushPermissionState().then(setPushState).catch(() => setPushState('unsupported'));
    const unsubscribe = subscribeInAppNotifications(setItems);
    const timer = setTimeout(() => void markAllNotificationsRead(), 700);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [user?.uid]);

  const enablePush = async () => {
    setEnablingPush(true);
    try {
      setPushState(await registerPushNotifications());
    } catch {
      setPushState('denied');
    } finally {
      setEnablingPush(false);
    }
  };

  const removeAll = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteAllNotifications();
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PublicHeader />
      <KeyboardAwareScrollView contentContainerStyle={styles.page}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>CẬP NHẬT TRONG ỨNG DỤNG</Text>
            <Text style={styles.title}>Thông báo</Text>
            <Text style={styles.subtitle}>
              Thông báo được lưu trong tài khoản và đồng bộ trên mọi thiết bị.
            </Text>
          </View>
          {!!user && !!items.length && <View style={styles.headingActions}><Pressable onPress={() => void markAllNotificationsRead()} style={styles.readButton}><Text style={styles.readButtonText}>Đánh dấu đã đọc</Text></Pressable><Pressable disabled={deleting} onPress={removeAll} style={[styles.deleteButton, confirmDelete && styles.deleteButtonConfirm]}><Text style={[styles.deleteButtonText, confirmDelete && styles.deleteButtonTextConfirm]}>{deleting ? 'Đang xóa…' : confirmDelete ? 'Xác nhận xóa tất cả' : 'Xóa tất cả'}</Text></Pressable></View>}
        </View>
        {!!user && (
          <View style={styles.pushCard}>
            <View style={styles.pushCopy}>
              <Text style={styles.pushTitle}>
                {pushState === 'enabled' ? 'Thông báo đẩy đã được bật' : 'Nhận thông báo khi ứng dụng đang đóng'}
              </Text>
              <Text style={styles.pushText}>
                {pushState === 'enabled'
                  ? 'Thiết bị này sẽ nhận thông báo mới ngay cả khi bạn không mở ứng dụng.'
                  : pushState === 'unsupported'
                    ? pushSetupHint ?? 'Thiết bị hoặc trình duyệt này chưa hỗ trợ hay chưa được cấu hình Web Push.'
                    : 'Cho phép Nối Vòng Tay gửi thông báo đến thiết bị này.'}
              </Text>
            </View>
            {pushState !== 'enabled' && pushState !== 'unsupported' && (
              <Pressable disabled={enablingPush} onPress={enablePush} style={styles.enablePushButton}>
                <Text style={styles.enablePushText}>{enablingPush ? 'Đang bật…' : 'Bật thông báo'}</Text>
              </Pressable>
            )}
          </View>
        )}
        {!checkingUser && !user ? (
          <View style={styles.empty}>
            <View style={styles.emptyBell}><View style={styles.bellBody} /><View style={styles.bellBase} /></View>
            <Text style={styles.emptyTitle}>Đăng nhập để xem thông báo</Text>
            <Text style={styles.emptyText}>Thông báo được lưu riêng trong tài khoản và sẽ đồng bộ trên mọi thiết bị bạn đăng nhập.</Text>
            <Pressable onPress={() => router.push('/account')} style={styles.loginButton}><Text style={styles.loginButtonText}>Đăng nhập tài khoản</Text></Pressable>
          </View>
        ) : !items.length ? (
          <View style={styles.empty}>
            <View style={styles.emptyBell}><View style={styles.bellBody} /><View style={styles.bellBase} /></View>
            <Text style={styles.emptyTitle}>Chưa có thông báo mới</Text>
            <Text style={styles.emptyText}>Hồ sơ mới, nội dung vừa cập nhật và khoản tiền Admin nạp sẽ xuất hiện tại đây.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                disabled={!item.caseId}
                onPress={() => item.caseId && router.push(`/cases/${item.caseId}`)}
                style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && styles.rowPressed]}>
                <NotificationMark type={item.type} />
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.body}>{item.body}</Text>
                  <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
                </View>
                {!!item.caseId && <Text style={styles.arrow}>›</Text>}
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function NotificationMark({ type }: { type: InAppNotification['type'] }) {
  const colors = type === 'balance'
    ? { backgroundColor: Colors.yellowSoft, color: Colors.yellow, label: 'đ' }
    : type === 'new_case'
      ? { backgroundColor: Colors.pinkSoft, color: Colors.pink, label: '+' }
      : { backgroundColor: Colors.purpleSoft, color: Colors.purple, label: '↻' };
  return <View style={[styles.mark, { backgroundColor: colors.backgroundColor }]}><Text style={[styles.markText, { color: colors.color }]}>{colors.label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  page: { width: '100%', maxWidth: 850, alignSelf: 'center', padding: 20, paddingTop: 38, paddingBottom: 60 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 },
  headingCopy: { flex: 1, minWidth: 0, maxWidth: '100%' },
  eyebrow: { color: Colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: Colors.ink, fontSize: 34, fontWeight: '900', marginTop: 5 },
  subtitle: { color: Colors.muted, fontSize: 12, marginTop: 5 },
  headingActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  readButton: { borderWidth: 1, borderColor: Colors.line, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  readButtonText: { color: Colors.primaryDark, fontSize: 9, fontWeight: '800' },
  deleteButton: { borderWidth: 1, borderColor: '#F2C5C5', backgroundColor: Colors.redSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  deleteButtonConfirm: { backgroundColor: Colors.red, borderColor: Colors.red },
  deleteButtonText: { color: Colors.red, fontSize: 9, fontWeight: '800' },
  deleteButtonTextConfirm: { color: '#fff' },
  list: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderRadius: 20, overflow: 'hidden', marginTop: 25 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.line },
  rowUnread: { backgroundColor: Colors.primaryMist },
  rowPressed: { opacity: 0.68 },
  mark: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 18, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  itemTitle: { flex: 1, color: Colors.ink, fontSize: 12, fontWeight: '900' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.red },
  body: { color: Colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  time: { color: '#8A9A90', fontSize: 8, marginTop: 5 },
  arrow: { color: Colors.primary, fontSize: 24, fontWeight: '700' },
  empty: { alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderRadius: 20, padding: 34, marginTop: 25 },
  emptyBell: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  bellBody: { width: 20, height: 20, borderWidth: 2, borderColor: Colors.primary, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomWidth: 0 },
  bellBase: { width: 25, height: 2, borderRadius: 1, backgroundColor: Colors.primary },
  emptyTitle: { color: Colors.ink, fontSize: 17, fontWeight: '900', marginTop: 15 },
  emptyText: { color: Colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 6, maxWidth: 440 },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, marginTop: 18 },
  loginButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  pushCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.line, borderRadius: 16, padding: 16, marginTop: 20 },
  pushCopy: { flex: 1, flexBasis: 220, minWidth: 0 },
  pushTitle: { color: Colors.ink, fontSize: 12, fontWeight: '900' },
  pushText: { color: Colors.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  enablePushButton: { backgroundColor: Colors.primary, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 11 },
  enablePushText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});
