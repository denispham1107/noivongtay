import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Colors, Shadows } from '@/constants/brand';
import { Text, TextInput } from '@/components/fixed-text';
import { adjustUserBalance } from '@/services/support';
import { deleteRegisteredUser, getRegisteredUsers, updateRegisteredUser, validateRegistration, type AppUser } from '@/services/users';
import { formatMoney, formatMoneyInput, normalizeMoney } from '@/utils/currency';

export function AdminUserManager() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [balance, setBalance] = useState('0');
  const [pendingDelete, setPendingDelete] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await getRegisteredUsers();
      setUsers(items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const startEdit = (user: AppUser) => {
    setEditing(user);
    setFullName(user.fullName);
    setPhone(user.phone);
    setEmail(user.email);
    setBalance(formatMoneyInput(user.balance));
    setPendingDelete('');
    setError('');
    setMessage('');
  };

  const save = async () => {
    if (!editing) return;
    const validationError = validateRegistration({ fullName, phone, email, password: '12345678' });
    if (validationError) return setError(validationError);
    const nextBalance = normalizeMoney(balance);
    if (nextBalance === null) return setError('Số tiền nạp phải là số nguyên từ 0 trở lên.');
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateRegisteredUser(editing.uid, { fullName, phone, email });
      await adjustUserBalance(editing.uid, nextBalance);
      setEditing(null);
      setMessage('Đã cập nhật thông tin và số tiền nạp của người dùng.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật người dùng.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (user: AppUser) => {
    if (pendingDelete !== user.uid) {
      setPendingDelete(user.uid);
      setMessage(`Nhấn “Xác nhận xóa” để xóa vĩnh viễn tài khoản ${user.email}.`);
      setError('');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteRegisteredUser(user.uid);
      setPendingDelete('');
      setEditing(null);
      setMessage('Đã xóa tài khoản người dùng.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xóa người dùng.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <View style={styles.header}><View><Text style={styles.title}>Quản lý người dùng</Text><Text style={styles.subtitle}>Chỉnh sửa thông tin hoặc xóa các tài khoản đã đăng ký.</Text></View><View style={styles.count}><Text style={styles.countValue}>{users.length}</Text><Text style={styles.countLabel}>người dùng</Text></View></View>
    {!!error && <Text style={styles.error}>{error}</Text>}{!!message && <Text style={styles.success}>{message}</Text>}
    {editing && <View style={styles.editCard}><View style={styles.editHeader}><View><Text style={styles.panelTitle}>Chỉnh sửa: {editing.fullName}</Text><Text style={styles.uid}>UID: {editing.uid}</Text></View><Pressable onPress={() => setEditing(null)} style={styles.cancel}><Text style={styles.cancelText}>Đóng</Text></Pressable></View><View style={styles.formGrid}><Field label="Họ tên"><TextInput value={fullName} onChangeText={setFullName} style={styles.input} /></Field><Field label="Số điện thoại"><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} /></Field><Field label="Email"><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} /></Field><Field label="Số tiền nạp"><TextInput value={balance} onChangeText={(value) => setBalance(formatMoneyInput(value))} keyboardType="number-pad" placeholder="0" style={styles.input} /></Field></View><Text style={styles.balancePreview}>Số dư sau khi lưu: {formatMoney(normalizeMoney(balance) ?? 0)}</Text><Text style={styles.note}>Khi đổi email, địa chỉ đăng nhập Firebase của người dùng cũng được cập nhật. Số tiền nạp không được âm.</Text><Pressable disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu thay đổi</Text>}</Pressable></View>}
    <View style={styles.table}><View style={styles.tableHeader}><View><Text style={styles.panelTitle}>Danh sách người dùng</Text><Text style={styles.rowHint}>Nhấn vào một dòng để xem và chỉnh sửa.</Text></View><Pressable onPress={refresh}><Text style={styles.refresh}>↻ Làm mới</Text></Pressable></View>{loading ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : users.length === 0 ? <Text style={styles.empty}>Chưa có tài khoản người dùng nào.</Text> : users.map((user) => <Pressable key={user.uid} accessibilityRole="button" accessibilityLabel={`Chỉnh sửa người dùng ${user.fullName || user.email}`} onPress={() => startEdit(user)} style={({ pressed }) => [styles.row, editing?.uid === user.uid && styles.rowActive, pressed && styles.rowPressed]}><View style={styles.avatar}><Text style={styles.avatarText}>{(user.fullName || user.email).slice(0, 1).toUpperCase()}</Text></View><View style={styles.identity}><Text style={styles.name}>{user.fullName || 'Chưa có họ tên'}</Text><Text style={styles.email}>{user.email}</Text><Text style={styles.phone}>{user.phone || 'Chưa có số điện thoại'}</Text></View><View style={styles.balanceBadge}><Text style={styles.balanceBadgeLabel}>Số tiền nạp</Text><Text style={styles.balanceBadgeValue}>{formatMoney(user.balance)}</Text></View><View style={styles.status}><Text style={styles.statusText}>Đang hoạt động</Text></View><View style={styles.actions}><Pressable disabled={saving} onPress={(event) => { event.stopPropagation(); void remove(user); }} style={[styles.deleteButton, pendingDelete === user.uid && styles.deleteConfirm]}><Text style={[styles.deleteText, pendingDelete === user.uid && styles.deleteConfirmText]}>{pendingDelete === user.uid ? 'Xác nhận xóa' : 'Xóa'}</Text></Pressable></View></Pressable>)}</View>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }

const styles = StyleSheet.create<any>({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15, marginBottom: 22 }, title: { color: Colors.ink, fontSize: 25, fontWeight: '900' }, subtitle: { color: Colors.muted, fontSize: 12, marginTop: 6 }, count: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' }, countValue: { color: '#fff', fontSize: 20, fontWeight: '900' }, countLabel: { color: '#fff', fontSize: 8, fontWeight: '700' }, editCard: { backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 18, padding: 20, marginBottom: 18, ...Shadows.card }, editHeader: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }, panelTitle: { color: Colors.ink, fontSize: 15, fontWeight: '900' }, uid: { flexShrink: 1, color: Colors.muted, fontSize: 8, marginTop: 4 }, cancel: { borderWidth: 1, borderColor: Colors.line, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }, cancelText: { color: Colors.muted, fontSize: 9, fontWeight: '800' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 17 }, field: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, width: '100%' }, label: { color: Colors.ink, fontSize: 10, fontWeight: '800', marginBottom: 6 }, input: { width: '100%', borderWidth: 1, borderColor: Colors.line, borderRadius: 10, backgroundColor: '#FCFEFD', color: Colors.ink, paddingHorizontal: 12, paddingVertical: 11, fontSize: 11, outlineStyle: 'none' }, note: { color: Colors.muted, fontSize: 9, marginTop: 12 }, saveButton: { alignSelf: 'flex-start', minWidth: 140, backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center', padding: 12, marginTop: 13 }, saveText: { color: '#fff', fontSize: 10, fontWeight: '900' }, disabled: { opacity: 0.5 }, table: { backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 16, overflow: 'hidden' }, tableHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, rowHint: { color: Colors.muted, fontSize: 8, marginTop: 3 }, refresh: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800' }, loader: { margin: 36 }, empty: { color: Colors.muted, textAlign: 'center', padding: 36 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.line }, rowActive: { backgroundColor: Colors.primarySoft }, rowPressed: { opacity: 0.72 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: Colors.primaryDark, fontSize: 15, fontWeight: '900' }, identity: { flexGrow: 1, flexShrink: 1, flexBasis: 190, minWidth: 0 }, name: { color: Colors.ink, fontSize: 12, fontWeight: '900' }, email: { flexShrink: 1, color: Colors.muted, fontSize: 9, marginTop: 3 }, phone: { color: Colors.primaryDark, fontSize: 9, marginTop: 2 }, status: { backgroundColor: Colors.greenSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 }, statusText: { color: Colors.green, fontSize: 8, fontWeight: '900' }, actions: { flexDirection: 'row', gap: 6 }, deleteButton: { backgroundColor: Colors.redSoft, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8 }, deleteConfirm: { backgroundColor: Colors.red }, deleteText: { color: Colors.red, fontSize: 9, fontWeight: '900' }, deleteConfirmText: { color: '#fff' }, error: { color: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 10, padding: 11, fontSize: 11, marginBottom: 14 }, success: { color: Colors.primaryDark, backgroundColor: Colors.primarySoft, borderRadius: 10, padding: 11, fontSize: 11, marginBottom: 14 },
  balancePreview: { color: Colors.primaryDark, backgroundColor: Colors.primarySoft, borderRadius: 10, padding: 10, fontSize: 11, fontWeight: '800', marginTop: 12 },
  balanceBadge: { backgroundColor: Colors.yellowSoft, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, minWidth: 110 },
  balanceBadgeLabel: { color: Colors.muted, fontSize: 8, fontWeight: '700' },
  balanceBadgeValue: { color: Colors.ink, fontSize: 12, fontWeight: '900', marginTop: 2 },
});
