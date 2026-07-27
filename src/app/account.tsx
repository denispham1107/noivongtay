import { router } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { BrandedLoader } from '@/components/branded-loader';
import { Text, TextInput } from '@/components/fixed-text';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { PasswordInput } from '@/components/password-input';
import { Colors, Shadows } from '@/constants/brand';
import { auth } from '@/services/firebase';
import { getCurrentUserProfile, loginUser, logoutUser, registerUser, type AppUser } from '@/services/users';
import { formatMoney } from '@/utils/currency';

type Mode = 'login' | 'register';

function accountRoleLabel(role?: string) {
  if (role === 'super_admin') return 'Quản trị viên cao nhất';
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'editor') return 'Biên tập viên';
  if (role === 'moderator') return 'Kiểm duyệt viên';
  return 'Người dùng';
}

function formatAccountDate(value: unknown) {
  if (!value) return 'Chưa có thông tin';
  const date = value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Chưa có thông tin';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function friendlyAuthError(reason: unknown) {
  const code = typeof reason === 'object' && reason && 'code' in reason ? String(reason.code) : '';
  if (code.includes('email-already-in-use')) return 'Email này đã được đăng ký.';
  if (code.includes('invalid-credential')) return 'Email hoặc mật khẩu không đúng.';
  if (code.includes('too-many-requests')) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.';
  if (code.includes('network-request-failed')) return 'Không thể kết nối Firebase. Hãy kiểm tra Internet.';
  return reason instanceof Error && reason.message ? reason.message : 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
}

export default function AccountPage() {
  const { width } = useWindowDimensions();
  const desktop = width >= 760;
  const [mode, setMode] = useState<Mode>('login');
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    setProfile(currentUser ? await getCurrentUserProfile(currentUser.uid).catch(() => null) : null);
    setChecking(false);
  }), []);

  const submit = async () => {
    if (!email.trim() || !password || (mode === 'register' && (!fullName.trim() || !phone.trim()))) {
      setError('Hãy nhập đầy đủ các thông tin bắt buộc.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const authenticatedUser = mode === 'register' ? await registerUser({ fullName, phone, email, password }) : await loginUser(email, password);
      setUser(authenticatedUser);
      setProfile(await getCurrentUserProfile(authenticatedUser.uid).catch(() => null));
      setPassword('');
    } catch (reason) {
      setError(friendlyAuthError(reason));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return <BrandedLoader />;

  if (user) return <SafeAreaView style={styles.safe} edges={['top']}><KeyboardAwareScrollView contentContainerStyle={styles.loggedPage}><View style={styles.loggedCard}><BrandMark /><View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.fullName || user.displayName || user.email || 'N').slice(0, 1).toUpperCase()}</Text></View><Text style={styles.title}>Xin chào, {profile?.fullName || user.displayName || 'bạn'}!</Text><Text style={styles.subtitle}>Toàn bộ thông tin tài khoản Nối Vòng Tay của bạn.</Text><View style={styles.balanceCard}><Text style={styles.balanceLabel}>Số tiền nạp</Text><Text style={styles.balanceValue}>{formatMoney(profile?.balance ?? 0)}</Text><Text style={styles.balanceNote}>Số dư hiện có để hỗ trợ các hoàn cảnh.</Text></View><View style={styles.infoBox}><Info label="Họ tên" value={profile?.fullName || user.displayName || 'Chưa cập nhật'} /><Info label="Số điện thoại" value={profile?.phone || 'Chưa cập nhật'} /><Info label="Email" value={user.email || profile?.email || ''} /><Info label="Loại tài khoản" value={accountRoleLabel(profile?.role)} /><Info label="Trạng thái" value={profile?.status === 'disabled' ? 'Đã khóa' : 'Đang hoạt động'} /><Info label="Mã tài khoản (UID)" value={user.uid} /><Info label="Ngày tạo tài khoản" value={formatAccountDate(profile?.createdAt || user.metadata.creationTime)} /><Info label="Lần đăng nhập gần nhất" value={formatAccountDate(user.metadata.lastSignInTime)} /></View><Pressable style={styles.primaryButton} onPress={() => router.replace('/')}><Text style={styles.primaryText}>Về trang chủ</Text></Pressable><Pressable style={styles.logoutButton} onPress={logoutUser}><Text style={styles.logoutText}>Đăng xuất</Text></Pressable></View></KeyboardAwareScrollView></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top']}><KeyboardAwareScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><View style={[styles.shell, desktop && styles.shellDesktop]}>{desktop && <View style={styles.welcome}><BrandMark /><Text style={styles.welcomeEyebrow}>KẾT NỐI YÊU THƯƠNG</Text><Text style={styles.welcomeTitle}>Mỗi tài khoản là một vòng tay cùng lan tỏa điều tử tế.</Text><Text style={styles.welcomeText}>Đăng ký để theo dõi và đồng hành cùng những hoàn cảnh bạn quan tâm.</Text><View style={styles.trust}><Text style={styles.trustText}>✓ Thông tin được bảo vệ bằng Firebase</Text><Text style={styles.trustText}>✓ Không công khai số điện thoại và email</Text></View></View>}<View style={styles.card}>{!desktop && <BrandMark />}<View style={styles.tabs}><Pressable onPress={() => { setMode('login'); setError(''); }} style={[styles.tab, mode === 'login' && styles.tabActive]}><Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Đăng nhập</Text></Pressable><Pressable onPress={() => { setMode('register'); setError(''); }} style={[styles.tab, mode === 'register' && styles.tabActive]}><Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Đăng ký</Text></Pressable></View><Text style={styles.title}>{mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản mới'}</Text><Text style={styles.subtitle}>{mode === 'login' ? 'Đăng nhập để tiếp tục đồng hành.' : 'Điền đầy đủ thông tin bên dưới để đăng ký.'}</Text>{mode === 'register' && <><Field label="Họ tên *"><TextInput value={fullName} onChangeText={setFullName} autoComplete="name" placeholder="Nguyễn Văn An" style={styles.input} /></Field><Field label="Số điện thoại *"><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="0901 234 567" style={styles.input} /></Field></>}<Field label="Email *"><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="email@example.com" style={styles.input} /></Field><Field label="Mật khẩu *"><PasswordInput value={password} onChangeText={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'} style={styles.input} onSubmitEditing={submit} /></Field>{!!error && <Text style={styles.error}>{error}</Text>}<Pressable disabled={submitting} onPress={submit} style={[styles.primaryButton, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>}</Pressable><Pressable onPress={() => router.replace('/')}><Text style={styles.back}>← Quay lại trang chủ</Text></Pressable></View></View></KeyboardAwareScrollView></SafeAreaView>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create<any>({
  safe: { flex: 1, backgroundColor: Colors.primaryMist }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryMist, gap: 12 }, muted: { color: Colors.muted }, page: { flexGrow: 1, justifyContent: 'center', padding: 20 }, shell: { width: '100%', maxWidth: 950, alignSelf: 'center' }, shellDesktop: { flexDirection: 'row', borderRadius: 28, overflow: 'hidden', ...Shadows.card }, welcome: { flex: 1, backgroundColor: '#DFF3E7', padding: 42, justifyContent: 'center' }, welcomeEyebrow: { color: Colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 45 }, welcomeTitle: { color: Colors.ink, fontSize: 35, lineHeight: 44, fontWeight: '900', marginTop: 12 }, welcomeText: { color: Colors.muted, fontSize: 14, lineHeight: 23, marginTop: 14 }, trust: { gap: 8, marginTop: 30 }, trustText: { color: Colors.primaryDark, fontSize: 11, fontWeight: '700' }, card: { flex: 1, backgroundColor: Colors.paper, padding: 34, borderWidth: 1, borderColor: Colors.line, borderRadius: 24 }, tabs: { flexDirection: 'row', backgroundColor: Colors.primaryMist, borderRadius: 12, padding: 4, marginTop: 20, marginBottom: 22 }, tab: { flex: 1, alignItems: 'center', padding: 11, borderRadius: 9 }, tabActive: { backgroundColor: Colors.primary }, tabText: { color: Colors.muted, fontSize: 12, fontWeight: '800' }, tabTextActive: { color: '#fff' }, title: { color: Colors.ink, fontSize: 27, lineHeight: 34, fontWeight: '900', marginTop: 10 }, subtitle: { color: Colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6, marginBottom: 20 }, field: { marginBottom: 14 }, label: { color: Colors.ink, fontSize: 11, fontWeight: '800', marginBottom: 7 }, input: { borderWidth: 1, borderColor: Colors.line, backgroundColor: '#FCFEFD', color: Colors.ink, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, fontSize: 12, outlineStyle: 'none' }, error: { color: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 10, padding: 11, fontSize: 11, marginBottom: 4 }, primaryButton: { minHeight: 48, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 13, marginTop: 10 }, primaryText: { color: '#fff', fontSize: 12, fontWeight: '900' }, disabled: { opacity: 0.55 }, back: { color: Colors.primaryDark, fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 18 }, loggedPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, loggedCard: { width: '100%', maxWidth: 510, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderRadius: 24, padding: 34, ...Shadows.card }, avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 30 }, avatarText: { color: '#fff', fontSize: 28, fontWeight: '900' }, infoBox: { borderWidth: 1, borderColor: Colors.line, borderRadius: 14, overflow: 'hidden', marginTop: 10 }, infoRow: { padding: 13, borderBottomWidth: 1, borderBottomColor: Colors.line }, infoLabel: { color: Colors.muted, fontSize: 9, fontWeight: '700' }, infoValue: { color: Colors.ink, fontSize: 12, fontWeight: '800', marginTop: 3 }, logoutButton: { borderWidth: 1, borderColor: Colors.red, borderRadius: 12, alignItems: 'center', padding: 13, marginTop: 10 }, logoutText: { color: Colors.red, fontSize: 12, fontWeight: '900' },
  balanceCard: { backgroundColor: Colors.primarySoft, borderRadius: 16, padding: 18, marginTop: 18, marginBottom: 8 },
  balanceLabel: { color: Colors.primaryDark, fontSize: 11, fontWeight: '800' },
  balanceValue: { color: Colors.ink, fontSize: 30, fontWeight: '900', marginTop: 4 },
  balanceNote: { color: Colors.muted, fontSize: 10, marginTop: 4 },
});
