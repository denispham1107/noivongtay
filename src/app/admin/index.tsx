import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { BrandedLoader } from '@/components/branded-loader';
import { AdminUserManager } from '@/components/admin-user-manager';
import { CaseVideoPlayer } from '@/components/case-video';
import { Text, TextInput } from '@/components/fixed-text';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { PasswordInput } from '@/components/password-input';
import { Colors, Shadows } from '@/constants/brand';
import type { CaseVideo } from '@/data/cases';
import {
  createCharityCase,
  deleteCharityCaseVideo,
  deleteCharityCaseYoutubeLink,
  getAdminCases,
  isAdminRole,
  updateCharityCase,
  type AdminCase,
  type AdminRole,
  type CaseImageInput,
  type CaseStatus,
  type CaseVideoInput,
  type NewCharityCase,
} from '@/services/admin';
import { createCategoryId, getCaseCategories, saveCaseCategories, type CaseCategory } from '@/services/categories';
import { auth, isFirebaseConfigured } from '@/services/firebase';
import { createPriorityId, getCasePriorities, priorityColorPalette, priorityTextColor, saveCasePriorities, type CasePriority } from '@/services/priorities';
import { removeCurrentDevicePushToken } from '@/services/push-token-registry';
import { adjustCaseReceivedAmount } from '@/services/support';
import { formatMoney, formatMoneyInput, normalizeMoney } from '@/utils/currency';
import { normalizeCaseVideo } from '@/utils/case-video';

type Section = 'Tổng quan' | 'Hoàn cảnh' | 'Người dùng';
type CaseManagerView = 'records' | 'setup';

function adminSections(role: AdminRole): Section[] {
  return role === 'super_admin' || role === 'admin' ? ['Tổng quan', 'Hoàn cảnh', 'Người dùng'] : ['Tổng quan', 'Hoàn cảnh'];
}

function createImageId(index: number) {
  return `image-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [accessError, setAccessError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setRole(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    currentUser.getIdTokenResult(true).then((token) => {
      if (!isAdminRole(token.claims.role)) {
        setUser(currentUser);
        setRole(null);
        setAccessError('Tài khoản này chưa được cấp vai trò quản trị.');
      } else {
        setUser(currentUser);
        setRole(token.claims.role);
        setAccessError('');
      }
    }).catch(() => setAccessError('Không thể kiểm tra quyền quản trị.')).finally(() => setChecking(false));
  }), []);

  if (checking) return <LoadingScreen />;
  if (!isFirebaseConfigured) return <MessageScreen title="Chưa có cấu hình Firebase" text="Hãy kiểm tra tệp .env rồi khởi động lại Expo." />;
  if (!user || !role) return <LoginScreen currentUser={user} accessError={accessError} />;
  return <AdminDashboard user={user} role={role} />;
}

function LoadingScreen() {
  return <BrandedLoader />;
}

function MessageScreen({ title, text }: { title: string; text: string }) {
  return <SafeAreaView style={styles.center}><BrandMark /><Text style={styles.loginTitle}>{title}</Text><Text style={styles.loginSubtitle}>{text}</Text></SafeAreaView>;
}

function LoginScreen({ currentUser, accessError }: { currentUser: User | null; accessError: string }) {
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(accessError);

  const login = async () => {
    if (!email.trim() || !password) {
      setError('Hãy nhập đầy đủ email và mật khẩu.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (currentUser) {
        await removeCurrentDevicePushToken();
        await signOut(auth);
      }
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await credential.user.getIdTokenResult(true);
      if (!isAdminRole(token.claims.role)) {
        setError('Đăng nhập thành công nhưng tài khoản chưa có quyền quản trị.');
      }
    } catch (reason) {
      const code = typeof reason === 'object' && reason && 'code' in reason ? String(reason.code) : '';
      setError(code.includes('invalid-credential') ? 'Email hoặc mật khẩu không đúng.' : 'Không thể đăng nhập. Hãy kiểm tra kết nối và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return <SafeAreaView style={styles.loginSafe} edges={['top']}>
    <KeyboardAwareScrollView contentContainerStyle={styles.loginPage} keyboardShouldPersistTaps="handled">
    <View style={styles.loginCard}>
      <BrandMark />
      <View style={styles.loginBadge}><Text style={styles.loginBadgeText}>KHU VỰC QUẢN TRỊ</Text></View>
      <Text style={styles.loginTitle}>Đăng nhập để quản lý hồ sơ</Text>
      <Text style={styles.loginSubtitle}>Chỉ tài khoản đã được cấp quyền mới có thể đăng và xuất bản thông tin.</Text>
      <Field label="Email quản trị" compact><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="admin@example.com" placeholderTextColor={Colors.muted} style={styles.input} /></Field>
      <Field label="Mật khẩu" compact><PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" placeholder="Nhập mật khẩu" placeholderTextColor={Colors.muted} style={styles.input} onSubmitEditing={login} /></Field>
      {!!error && <Text style={styles.errorBox}>{error}</Text>}
      <Pressable disabled={submitting} style={[styles.primaryButton, submitting && styles.disabled]} onPress={login}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Đăng nhập an toàn</Text>}
      </Pressable>
      <Pressable onPress={() => router.replace('/')}><Text style={styles.backLink}>← Quay lại trang công khai</Text></Pressable>
    </View>
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}

function AdminDashboard({ user, role }: { user: User; role: AdminRole }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const compact = width < 480;
  const [section, setSection] = useState<Section>('Tổng quan');
  const [showForm, setShowForm] = useState(false);
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CaseCategory[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<CasePriority[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [caseError, setCaseError] = useState('');

  const refresh = useCallback(async () => {
    setLoadingCases(true);
    setCaseError('');
    try {
      const [nextCases, nextCategories, nextPriorities] = await Promise.all([getAdminCases(), getCaseCategories(), getCasePriorities()]);
      setCases(nextCases);
      setCategoryOptions(nextCategories);
      setPriorityOptions(nextPriorities);
    } catch (reason) {
      setCaseError(reason instanceof Error ? reason.message : 'Không thể tải danh sách hồ sơ.');
    } finally {
      setLoadingCases(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const published = cases.filter((item) => item.status === 'published').length;
  const drafts = cases.length - published;

  const openCreate = () => {
    setSection('Hoàn cảnh');
    setShowForm(true);
  };

  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.app}>
    {desktop && <Sidebar section={section} setSection={setSection} count={cases.length} role={role} />}
    <View style={styles.main}>
      <View style={[styles.topbar, compact && styles.topbarCompact]}>
        {!desktop && <BrandMark compact />}
        <View style={styles.topCopy}><Text style={styles.topTitle}>{section}</Text><Text style={styles.breadcrumb}>Quản trị / {section}</Text></View>
        <Pressable style={styles.siteButton} onPress={() => router.push('/')}><Text style={styles.siteButtonText}>↗ Trang công khai</Text></Pressable>
        <View style={styles.account}><Text style={styles.accountEmail} numberOfLines={1}>{user.email}</Text><Text style={styles.accountRole}>{role}</Text></View>
        <Pressable style={styles.signOutButton} onPress={async () => {
          await removeCurrentDevicePushToken();
          await signOut(auth);
        }}><Text style={styles.signOutText}>Đăng xuất</Text></Pressable>
      </View>
      {!desktop && <View style={[styles.mobileNav, compact && styles.mobileNavCompact]}>{adminSections(role).map((item) => <Pressable key={item} onPress={() => setSection(item)} style={[styles.mobilePill, compact && styles.mobilePillCompact, section === item && styles.mobilePillActive]}><Text style={[styles.mobilePillText, section === item && styles.mobilePillTextActive]}>{item}</Text></Pressable>)}</View>}
      <KeyboardAwareScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]} keyboardShouldPersistTaps="handled">
        {section === 'Tổng quan' ? <Overview total={cases.length} published={published} drafts={drafts} onCreate={openCreate} /> : section === 'Người dùng' ? <AdminUserManager /> : <CaseManager cases={cases} categories={categoryOptions} priorities={priorityOptions} loading={loadingCases} error={caseError} showForm={showForm} setShowForm={setShowForm} refresh={refresh} canManageMoney={role === 'super_admin' || role === 'admin'} />}
      </KeyboardAwareScrollView>
    </View>
  </View></SafeAreaView>;
}

function Sidebar({ section, setSection, count, role }: { section: Section; setSection: (section: Section) => void; count: number; role: AdminRole }) {
  return <View style={styles.sidebar}>
    <View style={styles.brand}><BrandMark /></View>
    <Text style={styles.menuLabel}>QUẢN LÝ</Text>
    {adminSections(role).map((item) => <Pressable key={item} onPress={() => setSection(item)} style={[styles.navItem, section === item && styles.navItemActive]}><Text style={styles.navIcon}>{item === 'Tổng quan' ? '⌂' : item === 'Hoàn cảnh' ? '♡' : '♙'}</Text><Text style={[styles.navLabel, section === item && styles.navLabelActive]}>{item}</Text>{item === 'Hoàn cảnh' && <Text style={styles.navBadge}>{count}</Text>}</Pressable>)}
    <View style={styles.sidebarBottom}><Text style={styles.helpTitle}>Dữ liệu được bảo vệ</Text><Text style={styles.helpText}>Mọi thao tác tạo và xuất bản đều được kiểm tra bằng quyền Firebase.</Text></View>
  </View>;
}

function Overview({ total, published, drafts, onCreate }: { total: number; published: number; drafts: number; onCreate: () => void }) {
  return <>
    <View style={styles.welcome}><View><Text style={styles.welcomeTitle}>Trung tâm quản trị Nối Vòng Tay</Text><Text style={styles.welcomeText}>Đăng thông tin đã xác minh và kết nối đến cộng đồng.</Text></View><Pressable style={styles.primaryButtonSmall} onPress={onCreate}><Text style={styles.primaryButtonText}>＋ Thêm hoàn cảnh mới</Text></Pressable></View>
    <View style={styles.stats}>
      <Stat value={total} label="Tổng hồ sơ" color={Colors.primary} bg={Colors.primarySoft} />
      <Stat value={published} label="Đang công khai" color={Colors.orange} bg={Colors.orangeSoft} />
      <Stat value={drafts} label="Bản nháp" color={Colors.purple} bg={Colors.purpleSoft} />
    </View>
    <View style={styles.guidePanel}><Text style={styles.panelTitle}>Quy trình đăng hồ sơ</Text><View style={styles.guideRow}><Guide number="1" title="Nhập thông tin" text="Chỉ sử dụng dữ liệu đã được đồng ý chia sẻ." /><Guide number="2" title="Chọn ảnh" text="JPEG, PNG hoặc WebP, nhỏ hơn 10 MB." /><Guide number="3" title="Xuất bản" text="Hồ sơ sẽ xuất hiện trên Web, iOS và Android." /></View></View>
  </>;
}

function Stat({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return <View style={styles.stat}><View style={[styles.statIcon, { backgroundColor: bg }]}><Text style={{ color, fontSize: 20 }}>♥</Text></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Guide({ number, title, text }: { number: string; title: string; text: string }) {
  return <View style={styles.guide}><Text style={styles.guideNumber}>{number}</Text><View style={styles.guideCopy}><Text style={styles.guideTitle}>{title}</Text><Text style={styles.guideText}>{text}</Text></View></View>;
}

function CaseManager({ cases, categories, priorities, loading, error, showForm, setShowForm, refresh, canManageMoney }: { cases: AdminCase[]; categories: CaseCategory[]; priorities: CasePriority[]; loading: boolean; error: string; showForm: boolean; setShowForm: (value: boolean) => void; refresh: () => Promise<void>; canManageMoney: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const [managerView, setManagerView] = useState<CaseManagerView>(showForm ? 'setup' : 'records');
  const [selectedCase, setSelectedCase] = useState<AdminCase | null>(null);

  const toggleCreateForm = () => {
    setManagerView('setup');
    setSelectedCase(null);
    setShowForm(!showForm);
  };

  const openCase = (item: AdminCase) => {
    setManagerView('records');
    setShowForm(false);
    setSelectedCase(item);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedCase(null);
  };

  const afterSaved = async () => {
    closeForm();
    await refresh();
  };

  return <>
    <View style={styles.welcome}><View><Text style={styles.welcomeTitle}>Quản lý hoàn cảnh</Text><Text style={styles.welcomeText}>Quản lý hồ sơ đã tạo hoặc mở khu vực tạo mới và thiết lập dữ liệu.</Text></View></View>
    <View style={[styles.caseManagerTabs, compact && styles.caseManagerTabsCompact]}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: managerView === 'records' }} onPress={() => { setManagerView('records'); setShowForm(false); }} style={[styles.caseManagerTab, compact && styles.caseManagerTabCompact, managerView === 'records' && styles.caseManagerTabActive]}>
        <View style={styles.caseManagerTabCopy}><Text style={[styles.caseManagerTabTitle, managerView === 'records' && styles.caseManagerTabTitleActive]}>Hồ sơ đã tạo</Text><Text style={[styles.caseManagerTabText, managerView === 'records' && styles.caseManagerTabTextActive]}>Xem và chỉnh sửa các hoàn cảnh</Text></View>
        <Text style={[styles.caseManagerTabBadge, managerView === 'records' && styles.caseManagerTabBadgeActive]}>{cases.length}</Text>
      </Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: managerView === 'setup' }} onPress={() => setManagerView('setup')} style={[styles.caseManagerTab, compact && styles.caseManagerTabCompact, managerView === 'setup' && styles.caseManagerTabActive]}>
        <View style={styles.caseManagerTabCopy}><Text style={[styles.caseManagerTabTitle, managerView === 'setup' && styles.caseManagerTabTitleActive]}>Tạo mới & thiết lập</Text><Text style={[styles.caseManagerTabText, managerView === 'setup' && styles.caseManagerTabTextActive]}>Tạo hồ sơ, danh mục và mức ưu tiên</Text></View>
        <Text style={[styles.caseManagerTabBadge, managerView === 'setup' && styles.caseManagerTabBadgeActive]}>3</Text>
      </Pressable>
    </View>
    {!!error && <Text style={styles.errorBox}>{error}</Text>}
    {managerView === 'records' ? <>
      <View style={styles.tablePanel}>
        <View style={styles.tableHeader}><View><Text style={styles.panelTitle}>Danh sách hồ sơ</Text><Text style={styles.panelSubtitle}>Nhấn vào một dòng để xem và chỉnh sửa.</Text></View><Pressable onPress={refresh}><Text style={styles.refreshText}>↻ Làm mới</Text></Pressable></View>
        {loading ? <ActivityIndicator style={styles.listLoader} color={Colors.primary} /> : cases.length === 0 ? <Text style={styles.emptyText}>Chưa có hồ sơ nào trong Firestore.</Text> : cases.map((item) => {
          const priorityOption = priorities.find((entry) => entry.name === item.priority);
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Xem và chỉnh sửa hồ sơ ${item.name}`} onPress={() => openCase(item)} style={({ pressed }) => [styles.caseRow, selectedCase?.id === item.id && styles.caseRowSelected, pressed && styles.caseRowPressed]}><Image source={item.image} style={styles.caseThumb} contentFit="cover" /><View style={styles.caseName}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowSub}>{item.category} · {item.location}</Text></View>{priorityOption && <View style={[styles.status, { backgroundColor: priorityOption.color }]}><Text style={[styles.statusText, { color: priorityTextColor(priorityOption.color) }]}>● {item.priority}</Text></View>}<View style={[styles.status, { backgroundColor: item.status === 'published' ? Colors.greenSoft : Colors.purpleSoft }]}><Text style={[styles.statusText, { color: item.status === 'published' ? Colors.green : Colors.purple }]}>{item.status === 'published' ? 'Đang công khai' : 'Bản nháp'}</Text></View><Text style={styles.rowDate}>{item.updated}</Text><Text style={styles.rowAction}>Xem / Sửa ›</Text></Pressable>;
        })}
      </View>
      {selectedCase && <CaseForm key={selectedCase.id} mode="edit" categories={categories} priorities={priorities} initialCase={selectedCase} onSaved={afterSaved} onCancel={closeForm} canManageMoney={canManageMoney} />}
    </> : <>
      <View style={styles.caseSetupIntro}>
        <View style={styles.caseSetupCopy}><Text style={styles.panelTitle}>Tạo hoàn cảnh mới</Text><Text style={styles.panelSubtitle}>Nhập thông tin, hình ảnh và trạng thái xuất bản cho một hồ sơ mới.</Text></View>
        <Pressable style={styles.primaryButtonSmall} onPress={toggleCreateForm}><Text style={styles.primaryButtonText}>{showForm ? 'Đóng biểu mẫu' : '＋ Thêm hoàn cảnh mới'}</Text></Pressable>
      </View>
      {showForm && <CaseForm mode="create" categories={categories} priorities={priorities} onSaved={afterSaved} onCancel={closeForm} />}
      <CategoryManager categories={categories} cases={cases} onChanged={refresh} />
      <PriorityManager priorities={priorities} cases={cases} onChanged={refresh} />
    </>}
  </>;
}

function CategoryManager({ categories, cases, onChanged }: { categories: CaseCategory[]; cases: AdminCase[]; onChanged: () => Promise<void> }) {
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>, success: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật danh mục.');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return setError('Hãy nhập tên danh mục mới.');
    await run(() => saveCaseCategories([...categories, { id: createCategoryId(), name }]), 'Đã thêm danh mục mới.');
    setNewName('');
  };

  const renameCategory = async (item: CaseCategory) => {
    const name = editingName.trim();
    if (!name) return setError('Tên danh mục không được để trống.');
    const next = categories.map((entry) => entry.id === item.id ? { ...entry, name } : entry);
    await run(() => saveCaseCategories(next, { from: item.name, to: name }), 'Đã đổi tên danh mục và cập nhật các hồ sơ liên quan.');
    setEditingId('');
    setEditingName('');
  };

  const deleteCategory = async (item: CaseCategory) => {
    const usage = cases.filter((entry) => entry.category === item.name).length;
    if (usage > 0) {
      setPendingDeleteId('');
      setError(`Không thể xóa “${item.name}” vì đang có ${usage} hồ sơ sử dụng. Hãy chuyển các hồ sơ sang danh mục khác trước.`);
      return;
    }
    if (pendingDeleteId !== item.id) {
      setPendingDeleteId(item.id);
      setError('');
      setMessage('Nhấn “Xác nhận xóa” để hoàn tất.');
      return;
    }
    await run(() => saveCaseCategories(categories.filter((entry) => entry.id !== item.id)), 'Đã xóa danh mục.');
    setPendingDeleteId('');
  };

  return <View style={styles.categoryManager}>
    <View style={styles.categoryManagerHeader}><View><Text style={styles.panelTitle}>Quản lý danh mục</Text><Text style={styles.panelSubtitle}>Thêm, đổi tên hoặc xóa danh mục chưa được hồ sơ nào sử dụng.</Text></View><Text style={styles.categoryCount}>{categories.length} danh mục</Text></View>
    <View style={[styles.addCategoryRow, mobile && styles.addCategoryRowMobile]}><TextInput value={newName} onChangeText={setNewName} placeholder="Nhập tên danh mục mới" placeholderTextColor={Colors.muted} maxLength={40} style={[styles.categoryInput, mobile && styles.categoryInputMobile]} onSubmitEditing={addCategory} /><Pressable disabled={saving} onPress={addCategory} style={[styles.addCategoryButton, mobile && styles.addCategoryButtonMobile, saving && styles.disabled]}><Text style={styles.addCategoryButtonText}>＋ Thêm danh mục</Text></Pressable></View>
    <View style={[styles.categoryList, mobile && styles.categoryListMobile]}>{categories.map((item) => {
      const usage = cases.filter((entry) => entry.category === item.name).length;
      const editing = editingId === item.id;
      return <View key={item.id} style={[styles.categoryItem, mobile && styles.categoryItemMobile]}>
        {editing ? <TextInput autoFocus value={editingName} onChangeText={setEditingName} maxLength={40} style={styles.categoryEditInput} onSubmitEditing={() => renameCategory(item)} /> : <View style={styles.categoryNameWrap}><Text style={styles.categoryName}>{item.name}</Text><Text style={styles.categoryUsage}>{usage} hồ sơ</Text></View>}
        <View style={styles.categoryActions}>{editing ? <><Pressable disabled={saving} onPress={() => renameCategory(item)} style={styles.categorySaveButton}><Text style={styles.categorySaveText}>Lưu</Text></Pressable><Pressable onPress={() => setEditingId('')} style={styles.categoryCancelButton}><Text style={styles.categoryCancelText}>Hủy</Text></Pressable></> : <><Pressable onPress={() => { setEditingId(item.id); setEditingName(item.name); setPendingDeleteId(''); }} style={styles.categoryEditButton}><Text style={styles.categoryEditText}>Sửa</Text></Pressable><Pressable disabled={saving} onPress={() => deleteCategory(item)} style={[styles.categoryDeleteButton, pendingDeleteId === item.id && styles.categoryDeleteConfirm]}><Text style={[styles.categoryDeleteText, pendingDeleteId === item.id && styles.categoryDeleteConfirmText]}>{pendingDeleteId === item.id ? 'Xác nhận xóa' : 'Xóa'}</Text></Pressable></>}</View>
      </View>;
    })}</View>
    {!!error && <Text style={styles.errorBox}>{error}</Text>}{!!message && <Text style={styles.successBox}>{message}</Text>}
  </View>;
}

function PriorityManager({ priorities, cases, onChanged }: { priorities: CasePriority[]; cases: AdminCase[]; onChanged: () => Promise<void> }) {
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(priorityColorPalette[0]);
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState<string>(priorityColorPalette[0]);
  const [editingShowFirst, setEditingShowFirst] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>, success: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật mức độ ưu tiên.');
    } finally {
      setSaving(false);
    }
  };

  const addPriority = async () => {
    const name = newName.trim();
    if (!name) return setError('Hãy nhập tên mức độ ưu tiên mới.');
    await run(() => saveCasePriorities([...priorities, { id: createPriorityId(), name, color: newColor, showFirst: false }]), 'Đã thêm mức độ ưu tiên mới.');
    setNewName('');
  };

  const savePriority = async (item: CasePriority) => {
    const name = editingName.trim();
    if (!name) return setError('Tên mức độ ưu tiên không được để trống.');
    const next = priorities.map((entry) => entry.id === item.id ? { ...entry, name, color: editingColor, showFirst: editingShowFirst } : entry);
    await run(() => saveCasePriorities(next, { from: item.name, to: name }), item.name === name ? 'Đã cập nhật màu sắc và thứ tự hiển thị.' : 'Đã đổi tên và cập nhật các hồ sơ liên quan.');
    setEditingId('');
  };

  const deletePriority = async (item: CasePriority) => {
    const usage = cases.filter((entry) => entry.priority === item.name).length;
    if (usage > 0) {
      setPendingDeleteId('');
      setError(`Không thể xóa “${item.name}” vì đang có ${usage} hồ sơ sử dụng. Hãy chuyển các hồ sơ sang mức ưu tiên khác trước.`);
      return;
    }
    if (pendingDeleteId !== item.id) {
      setPendingDeleteId(item.id);
      setError('');
      setMessage('Nhấn “Xác nhận xóa” để hoàn tất.');
      return;
    }
    await run(() => saveCasePriorities(priorities.filter((entry) => entry.id !== item.id)), 'Đã xóa mức độ ưu tiên.');
    setPendingDeleteId('');
  };

  const toggleShowFirst = async (item: CasePriority) => {
    const nextValue = !item.showFirst;
    const next = priorities.map((entry) => entry.id === item.id ? { ...entry, showFirst: nextValue } : entry);
    await run(() => saveCasePriorities(next), nextValue ? `Đã đưa các hồ sơ “${item.name}” lên trên cùng.` : `Đã bỏ hiển thị trên cùng cho “${item.name}”.`);
  };

  const ColorChoices = ({ value, onChange }: { value: string; onChange: (color: string) => void }) => <View style={styles.colorChoices}>{priorityColorPalette.map((color) => <Pressable key={color} accessibilityLabel={`Chọn màu ${color}`} onPress={() => onChange(color)} style={[styles.colorChoice, { backgroundColor: color }, value === color && styles.colorChoiceActive]}><Text style={{ color: priorityTextColor(color), fontWeight: '900' }}>{value === color ? '✓' : ''}</Text></Pressable>)}</View>;
  const TopToggle = ({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={[styles.topToggle, value && styles.topToggleActive]}><Text style={[styles.topToggleText, value && styles.topToggleTextActive]}>{value ? '✓ ' : '□ '}Hiển thị trên cùng</Text></Pressable>;

  return <View style={styles.categoryManager}>
    <View style={styles.categoryManagerHeader}><View><Text style={styles.panelTitle}>Quản lý mức độ ưu tiên</Text><Text style={styles.panelSubtitle}>Tạo, đổi tên, chọn màu và quyết định mức nào được hiển thị trước.</Text></View><Text style={styles.categoryCount}>{priorities.length} mức</Text></View>
    <View style={styles.priorityAddArea}><View style={[styles.addCategoryRow, mobile && styles.addCategoryRowMobile]}><TextInput value={newName} onChangeText={setNewName} placeholder="Nhập tên mức độ ưu tiên mới" placeholderTextColor={Colors.muted} maxLength={40} style={[styles.categoryInput, mobile && styles.categoryInputMobile]} onSubmitEditing={addPriority} /><Pressable disabled={saving} onPress={addPriority} style={[styles.addCategoryButton, mobile && styles.addCategoryButtonMobile, saving && styles.disabled]}><Text style={styles.addCategoryButtonText}>＋ Thêm mức ưu tiên</Text></Pressable></View><ColorChoices value={newColor} onChange={setNewColor} /></View>
    <View style={[styles.categoryList, mobile && styles.categoryListMobile]}>{priorities.map((item) => {
      const usage = cases.filter((entry) => entry.priority === item.name).length;
      const editing = editingId === item.id;
      return <View key={item.id} style={[styles.priorityItem, mobile && styles.priorityItemMobile]}>
        {editing ? <View style={styles.priorityEditArea}><TextInput autoFocus value={editingName} onChangeText={setEditingName} maxLength={40} style={styles.categoryEditInput} onSubmitEditing={() => savePriority(item)} /><ColorChoices value={editingColor} onChange={setEditingColor} /><TopToggle value={editingShowFirst} onChange={setEditingShowFirst} /></View> : <View style={styles.categoryNameWrap}><View style={styles.priorityPreviewRow}><View style={[styles.priorityPreview, { backgroundColor: item.color }]}><Text style={[styles.priorityPreviewText, { color: priorityTextColor(item.color) }]}>● {item.name}</Text></View>{item.showFirst && <Text style={styles.pinnedBadge}>↑ Trên cùng</Text>}</View><Text style={styles.categoryUsage}>{usage} hồ sơ · {item.color}</Text></View>}
        <View style={styles.categoryActions}>{editing ? <><Pressable disabled={saving} onPress={() => savePriority(item)} style={styles.categorySaveButton}><Text style={styles.categorySaveText}>Lưu</Text></Pressable><Pressable onPress={() => setEditingId('')} style={styles.categoryCancelButton}><Text style={styles.categoryCancelText}>Hủy</Text></Pressable></> : <><Pressable disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked: item.showFirst }} onPress={() => toggleShowFirst(item)} style={[styles.directTopButton, item.showFirst && styles.directTopButtonActive]}><Text style={[styles.directTopText, item.showFirst && styles.directTopTextActive]}>{item.showFirst ? '✓ Trên cùng' : '□ Trên cùng'}</Text></Pressable><Pressable onPress={() => { setEditingId(item.id); setEditingName(item.name); setEditingColor(item.color); setEditingShowFirst(item.showFirst); setPendingDeleteId(''); }} style={styles.categoryEditButton}><Text style={styles.categoryEditText}>Sửa</Text></Pressable><Pressable disabled={saving} onPress={() => deletePriority(item)} style={[styles.categoryDeleteButton, pendingDeleteId === item.id && styles.categoryDeleteConfirm]}><Text style={[styles.categoryDeleteText, pendingDeleteId === item.id && styles.categoryDeleteConfirmText]}>{pendingDeleteId === item.id ? 'Xác nhận xóa' : 'Xóa'}</Text></Pressable></>}</View>
      </View>;
    })}</View>
    {!!error && <Text style={styles.errorBox}>{error}</Text>}{!!message && <Text style={styles.successBox}>{message}</Text>}
  </View>;
}

function CaseForm({ mode, categories, priorities, initialCase, onSaved, onCancel, canManageMoney = false }: { mode: 'create' | 'edit'; categories: CaseCategory[]; priorities: CasePriority[]; initialCase?: AdminCase; onSaved: () => Promise<void>; onCancel: () => void; canManageMoney?: boolean }) {
  const editing = mode === 'edit' && !!initialCase;
  const categoryNames = categories.map((item) => item.name);
  const [name, setName] = useState(initialCase?.name ?? '');
  const [location, setLocation] = useState(initialCase?.location ?? '');
  const [category, setCategory] = useState(initialCase?.category ?? categoryNames[0] ?? 'Y tế');
  const [summary, setSummary] = useState(initialCase?.summary ?? '');
  const [story, setStory] = useState(initialCase?.story ?? '');
  const priorityNames = priorities.map((item) => item.name);
  const [priority, setPriority] = useState(initialCase?.priority ?? priorityNames[0] ?? 'Đang cần hỗ trợ');
  const [progress, setProgress] = useState(String(initialCase?.progress ?? 0));
  const [supporters, setSupporters] = useState(String(initialCase?.supporters ?? 0));
  const [receivedAmount, setReceivedAmount] = useState(formatMoneyInput(initialCase?.receivedAmount ?? 0));
  const [images, setImages] = useState<CaseImageInput[]>(() => (initialCase?.images ?? []).map((entry, index) => ({
    id: entry.id,
    url: entry.url,
    storagePath: entry.storagePath,
    caption: entry.caption ?? '',
    altText: entry.altText ?? '',
    order: index,
  })));
  const [coverImageId, setCoverImageId] = useState(initialCase?.coverImageId ?? initialCase?.images?.[0]?.id ?? '');
  const [video, setVideo] = useState<CaseVideoInput | null>(() => initialCase?.video ? {
    source: initialCase.video.source,
    enabled: initialCase.video.enabled,
    url: initialCase.video.url,
    storagePath: initialCase.video.storagePath,
    youtubeId: initialCase.video.youtubeId,
    title: initialCase.video.title ?? '',
  } : null);
  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState(
    initialCase?.youtubeUrlDraft || (initialCase?.video?.source === 'youtube' ? initialCase.video.url : ''),
  );
  const [status, setStatus] = useState<CaseStatus>(initialCase?.status ?? 'draft');
  const [verified, setVerified] = useState(initialCase?.verified ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!categoryNames.includes(category) && categoryNames[0]) setCategory(categoryNames[0]);
  }, [category, categoryNames.join('|')]);

  useEffect(() => {
    if (!priorityNames.includes(priority) && priorityNames[0]) setPriority(priorityNames[0]);
  }, [priority, priorityNames.join('|')]);

  const valid = useMemo(() => name.trim() && location.trim() && summary.trim() && story.trim() && images.length > 0 && images.some((entry) => entry.id === coverImageId), [name, location, summary, story, images, coverImageId]);

  const pickImages = async () => {
    setError('');
    const remaining = 10 - images.length;
    if (remaining <= 0) {
      setError('Mỗi hồ sơ chỉ được đăng tối đa 10 hình ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8 });
    if (result.canceled) return;
    const oversized = result.assets.find((entry) => entry.fileSize && entry.fileSize >= 5 * 1024 * 1024);
    if (oversized) {
      setError(`Ảnh ${oversized.fileName || 'đã chọn'} phải nhỏ hơn 5 MB.`);
      return;
    }
    const added = result.assets.slice(0, remaining).map((asset, index): CaseImageInput => ({
      id: createImageId(index),
      url: asset.uri,
      caption: '',
      altText: name.trim() ? `Hình ảnh của ${name.trim()}` : 'Hình ảnh hoàn cảnh cần hỗ trợ',
      order: images.length + index,
      asset,
    }));
    setImages((current) => [...current, ...added]);
    if (!coverImageId && added[0]) setCoverImageId(added[0].id);
  };

  const updateImage = (id: string, patch: Partial<CaseImageInput>) => setImages((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));

  const removeImage = (id: string) => {
    setImages((current) => {
      const next = current.filter((entry) => entry.id !== id).map((entry, index) => ({ ...entry, order: index }));
      if (coverImageId === id) setCoverImageId(next[0]?.id ?? '');
      return next;
    });
  };

  const moveImage = (id: string, direction: -1 | 1) => {
    setImages((current) => {
      const index = current.findIndex((entry) => entry.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((entry, order) => ({ ...entry, order }));
    });
  };

  const pickVideo = async () => {
    setError('');
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Hãy cho phép ứng dụng truy cập thư viện để chọn video.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 1,
      videoMaxDuration: 600,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
      setError(`Video ${asset.fileName || 'đã chọn'} phải có dung lượng không quá 100 MB.`);
      return;
    }
    if (asset.mimeType && !['video/mp4', 'video/webm', 'video/quicktime'].includes(asset.mimeType)) {
      setError('Chỉ chấp nhận video MP4, WebM hoặc MOV.');
      return;
    }
    setVideo({
      source: 'upload',
      url: asset.uri,
      title: video?.title ?? '',
      asset,
    });
  };

  const videoPreview = useMemo(() => normalizeCaseVideo(video, true), [video]);

  const deleteVideo = async () => {
    setError('');
    setSuccess('');
    try {
      const deletingYoutube = video?.source === 'youtube';
      const persistedUpload = editing && initialCase && video?.source === 'upload' && !!video.storagePath && !video.asset;
      const persistedYoutube = editing && initialCase && deletingYoutube
        && !!(initialCase.youtubeUrlDraft || initialCase.video?.source === 'youtube');
      if (persistedUpload) await deleteCharityCaseVideo(initialCase.id);
      if (persistedYoutube) await deleteCharityCaseYoutubeLink(initialCase.id);
      if (deletingYoutube) setYoutubeUrlDraft('');
      setVideo(null);
      setSuccess(
        persistedUpload
          ? 'Đã xóa video khỏi hồ sơ và Firebase Storage.'
          : persistedYoutube
            ? 'Đã xóa liên kết YouTube khỏi hồ sơ.'
            : deletingYoutube
              ? 'Đã bỏ liên kết YouTube chưa lưu.'
              : 'Đã bỏ video chưa lưu.',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xóa video.');
    }
  };

  const submit = async () => {
    if (!valid) {
      setError('Hãy nhập đầy đủ các trường bắt buộc và chọn ảnh.');
      return;
    }
    const nextReceivedAmount = normalizeMoney(receivedAmount);
    if (editing && canManageMoney && nextReceivedAmount === null) {
      setError('Tổng số tiền đã nhận phải là số nguyên từ 0 trở lên.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const input: NewCharityCase = {
        name,
        location,
        category,
        summary,
        story,
        images,
        coverImageId,
        video,
        youtubeUrlDraft,
        priority,
        updated: 'Vừa cập nhật',
        progress: Number(progress) || 0,
        supporters: Number(supporters) || 0,
        verified,
        status,
      };
      if (editing && initialCase) {
        await updateCharityCase(initialCase.id, input);
        if (canManageMoney && nextReceivedAmount !== null && nextReceivedAmount !== Number(initialCase.receivedAmount ?? 0)) {
          await adjustCaseReceivedAmount(initialCase.id, nextReceivedAmount);
        }
      }
      else await createCharityCase(input);
      setSuccess(editing ? 'Đã cập nhật hồ sơ thành công.' : status === 'published' ? 'Đã xuất bản hồ sơ thành công.' : 'Đã lưu bản nháp thành công.');
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  };

  return <View style={styles.formCard}>
    <View style={styles.formHeader}><View><Text style={styles.panelTitle}>{editing ? `Xem và chỉnh sửa: ${initialCase?.name}` : 'Thông tin hoàn cảnh mới'}</Text><Text style={styles.panelSubtitle}>{editing ? 'Các thông tin và hình ảnh hiện tại đã được điền sẵn.' : 'Dấu * là trường bắt buộc.'}</Text></View><View style={styles.formHeaderActions}><Text style={styles.secureLabel}>✓ Được bảo vệ bởi Firebase</Text><Pressable style={styles.cancelButton} onPress={onCancel}><Text style={styles.cancelButtonText}>Đóng</Text></Pressable></View></View>
    <View style={styles.formGrid}>
      <Field grid label="Họ tên hoặc tên hồ sơ *"><TextInput value={name} onChangeText={setName} placeholder="Ví dụ: Bé Minh An" style={styles.input} /></Field>
      <Field grid label="Tỉnh/thành phố *"><TextInput value={location} onChangeText={setLocation} placeholder="Ví dụ: Đồng Nai" style={styles.input} /></Field>
    </View>
    <ChoiceField label="Danh mục" values={categoryNames} selected={category} onSelect={setCategory} />
    <Field label="Mô tả ngắn *"><TextInput value={summary} onChangeText={setSummary} placeholder="Nội dung xuất hiện trên thẻ hồ sơ" style={[styles.input, styles.multilineShort]} multiline /></Field>
    <Field label="Câu chuyện *"><TextInput value={story} onChangeText={setStory} placeholder="Trình bày hoàn cảnh rõ ràng, tôn trọng và đã được đồng ý chia sẻ" style={[styles.input, styles.multiline]} multiline textAlignVertical="top" /></Field>
    <PriorityChoiceField priorities={priorities} selected={priority} onSelect={setPriority} />
    <View style={styles.formGrid}>
      <Field grid label="Tiến độ hỗ trợ (%)"><TextInput value={progress} onChangeText={setProgress} keyboardType="number-pad" placeholder="0" style={styles.input} /></Field>
      <Field grid label="Số người quan tâm"><TextInput value={supporters} onChangeText={setSupporters} keyboardType="number-pad" placeholder="0" style={styles.input} /></Field>
      {editing && canManageMoney && <Field grid label="Tổng tiền đã nhận hỗ trợ"><TextInput value={receivedAmount} onChangeText={(value) => setReceivedAmount(formatMoneyInput(value))} keyboardType="number-pad" placeholder="0" style={styles.input} /><Text style={styles.moneyPreview}>{formatMoney(normalizeMoney(receivedAmount) ?? 0)}</Text></Field>}
    </View>
    <ImageManager images={images} coverImageId={coverImageId} onPick={pickImages} onCover={setCoverImageId} onUpdate={updateImage} onRemove={removeImage} onMove={moveImage} />
    <VideoManager video={video} youtubeUrlDraft={youtubeUrlDraft} preview={videoPreview} onChange={setVideo} onYoutubeUrlChange={setYoutubeUrlDraft} onPick={pickVideo} onDelete={deleteVideo} />
    <View style={styles.optionRow}><Pressable onPress={() => setVerified(!verified)} style={[styles.checkOption, verified && styles.checkOptionActive]}><Text style={[styles.checkText, verified && styles.checkTextActive]}>{verified ? '✓ ' : ''}Đã xác minh thông tin</Text></Pressable></View>
    <ChoiceField label="Trạng thái khi lưu" values={['draft', 'published']} labels={['Lưu bản nháp', 'Xuất bản công khai']} selected={status} onSelect={(value) => setStatus(value as CaseStatus)} />
    {status === 'published' && <Text style={styles.publishNotice}>Hồ sơ sẽ xuất hiện trên Web, iOS và Android ngay sau khi lưu.</Text>}
    {!!error && <Text style={styles.errorBox}>{error}</Text>}{!!success && <Text style={styles.successBox}>{success}</Text>}
    <Pressable disabled={submitting} style={[styles.primaryButton, (!valid || submitting) && styles.disabled]} onPress={submit}>{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{editing ? 'Lưu thay đổi' : status === 'published' ? 'Xuất bản hồ sơ' : 'Lưu bản nháp'}</Text>}</Pressable>
  </View>;
}

function ImageManager({ images, coverImageId, onPick, onCover, onUpdate, onRemove, onMove }: { images: CaseImageInput[]; coverImageId: string; onPick: () => Promise<void>; onCover: (id: string) => void; onUpdate: (id: string, patch: Partial<CaseImageInput>) => void; onRemove: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void }) {
  return <View style={styles.galleryManager}>
    <View style={styles.galleryHeader}><View><Text style={styles.fieldLabel}>Hình ảnh hồ sơ * ({images.length}/10)</Text><Text style={styles.galleryHelp}>Chọn một ảnh đại diện; dùng mũi tên để sắp xếp thứ tự hiển thị.</Text></View><Pressable disabled={images.length >= 10} style={[styles.uploadButton, images.length >= 10 && styles.disabled]} onPress={onPick}><Text style={styles.uploadButtonText}>＋ Chọn nhiều hình ảnh</Text></Pressable></View>
    {images.length === 0 ? <View style={styles.imagePlaceholderWide}><Text style={styles.imagePlaceholderText}>Chưa có hình ảnh. Có thể chọn tối đa 10 ảnh.</Text></View> : <View style={styles.adminGalleryGrid}>{images.map((entry, index) => {
      const preview = entry.asset?.uri || entry.url;
      const cover = entry.id === coverImageId;
      return <View key={entry.id} style={[styles.adminImageCard, cover && styles.adminImageCardCover]}>
        <View style={styles.adminImageWrap}><Image source={preview} style={styles.adminImage} contentFit="cover" /><Text style={styles.imageOrder}>{index + 1}</Text>{cover && <Text style={styles.coverBadge}>★ Ảnh đại diện</Text>}</View>
        <Pressable style={[styles.coverButton, cover && styles.coverButtonActive]} onPress={() => onCover(entry.id)}><Text style={[styles.coverButtonText, cover && styles.coverButtonTextActive]}>{cover ? '✓ Đang làm ảnh đại diện' : 'Đặt làm ảnh đại diện'}</Text></Pressable>
        <TextInput value={entry.caption} onChangeText={(caption) => onUpdate(entry.id, { caption })} placeholder="Mô tả ảnh (không bắt buộc)" style={styles.imageInput} />
        <TextInput value={entry.altText} onChangeText={(altText) => onUpdate(entry.id, { altText })} placeholder="Mô tả cho người khiếm thị" style={styles.imageInput} />
        <View style={styles.imageCardActions}><Pressable disabled={index === 0} onPress={() => onMove(entry.id, -1)} style={[styles.orderButton, index === 0 && styles.disabled]}><Text style={styles.orderButtonText}>←</Text></Pressable><Pressable disabled={index === images.length - 1} onPress={() => onMove(entry.id, 1)} style={[styles.orderButton, index === images.length - 1 && styles.disabled]}><Text style={styles.orderButtonText}>→</Text></Pressable><Pressable onPress={() => onRemove(entry.id)} style={styles.removeImageButton}><Text style={styles.removeImageText}>Xóa ảnh</Text></Pressable></View>
      </View>;
    })}</View>}
  </View>;
}

function VideoManager({ video, youtubeUrlDraft, preview, onChange, onYoutubeUrlChange, onPick, onDelete }: { video: CaseVideoInput | null; youtubeUrlDraft: string; preview: CaseVideo | null; onChange: (value: CaseVideoInput | null) => void; onYoutubeUrlChange: (value: string) => void; onPick: () => Promise<void>; onDelete: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const source = video?.enabled === false ? 'none' : video?.source ?? 'none';
  const selectSource = (next: 'none' | 'upload' | 'youtube') => {
    if (next === 'none') {
      onChange(video ? { ...video, enabled: false } : null);
      return;
    }
    if (video?.source === next) {
      onChange({ ...video, enabled: true, ...(next === 'youtube' ? { url: youtubeUrlDraft } : {}) });
      return;
    }
    onChange({ source: next, enabled: true, title: video?.title ?? '', ...(next === 'youtube' ? { url: youtubeUrlDraft } : {}) });
  };
  const removePermanently = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return <View style={styles.videoManager}>
    <View style={styles.galleryHeader}><View style={styles.videoHeading}><Text style={styles.fieldLabel}>Video hoàn cảnh (không bắt buộc)</Text><Text style={styles.galleryHelp}>Tải một video MP4, WebM hoặc MOV tối đa 100 MB, hoặc nhập liên kết YouTube.</Text></View></View>
    <View style={styles.videoSourceChoices}>
      {([
        ['none', 'Không dùng video'],
        ['upload', 'Tải video trực tiếp'],
        ['youtube', 'Liên kết YouTube'],
      ] as const).map(([value, label]) => <Pressable key={value} onPress={() => selectSource(value)} style={[styles.choice, source === value && styles.choiceActive]}><Text style={[styles.choiceText, source === value && styles.choiceTextActive]}>{source === value ? '✓ ' : ''}{label}</Text></Pressable>)}
    </View>
    {source === 'upload' && <>
      <Pressable onPress={onPick} style={styles.videoUploadButton}><Text style={styles.videoUploadButtonText}>{video?.asset || video?.url ? '↻ Chọn video khác' : '＋ Chọn video từ thiết bị'}</Text></Pressable>
      <Text style={styles.videoFileName}>{video?.asset?.fileName || (video?.url ? 'Video hiện đang được lưu trong hồ sơ.' : 'Chưa chọn video.')}</Text>
    </>}
    {source === 'youtube' && <TextInput value={youtubeUrlDraft} onChangeText={(url) => { onYoutubeUrlChange(url); onChange({ source: 'youtube', enabled: true, url, title: video?.title ?? '' }); }} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="Ví dụ: https://www.youtube.com/watch?v=..." style={styles.input} />}
    {source !== 'none' && <TextInput value={video?.title ?? ''} onChangeText={(title) => onChange({ ...video!, title })} placeholder="Tiêu đề video (không bắt buộc)" style={[styles.input, styles.videoTitleInput]} />}
    {source !== 'none' && preview ? <View style={styles.videoPreview}><Text style={styles.videoPreviewLabel}>Xem trước video</Text><CaseVideoPlayer video={preview} /></View> : source === 'youtube' && <Text style={styles.videoInvalidText}>Nhập đúng liên kết YouTube để xem trước video.</Text>}
    {source === 'none' && video?.source === 'youtube' && <Text style={styles.videoRetainedText}>Liên kết YouTube vẫn được giữ lại nhưng đang không hiển thị. Chọn “Liên kết YouTube” để dùng lại.</Text>}
    {!!video && <Pressable disabled={deleting} onPress={removePermanently} style={[styles.videoDeleteButton, deleting && styles.disabled]}>{deleting ? <ActivityIndicator color={Colors.red} /> : <Text style={styles.videoDeleteButtonText}>{video.source === 'upload' ? 'Xóa video vĩnh viễn' : 'Xóa liên kết YouTube'}</Text>}</Pressable>}
  </View>;
}

function Field({ label, children, compact = false, grid = false }: { label: string; children: React.ReactNode; compact?: boolean; grid?: boolean }) {
  return <View style={[styles.field, grid ? styles.gridField : styles.standaloneField, compact && styles.loginField]}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

function ChoiceField({ label, values, labels, selected, onSelect }: { label: string; values: string[]; labels?: string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={[styles.field, styles.standaloneField]}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.choices}>{values.map((value, index) => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceActive]}><Text style={[styles.choiceText, selected === value && styles.choiceTextActive]}>{labels?.[index] ?? value}</Text></Pressable>)}</View></View>;
}

function PriorityChoiceField({ priorities, selected, onSelect }: { priorities: CasePriority[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={[styles.field, styles.standaloneField]}><Text style={styles.fieldLabel}>Mức độ ưu tiên</Text><View style={styles.choices}>{priorities.map((item) => <Pressable key={item.id} onPress={() => onSelect(item.name)} style={[styles.priorityChoice, { backgroundColor: item.color }, selected === item.name && styles.priorityChoiceActive]}><Text style={[styles.priorityChoiceText, { color: priorityTextColor(item.color) }]}>{selected === item.name ? '✓ ' : '● '}{item.name}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create<any>({
  loginSafe: { flex: 1, backgroundColor: Colors.primaryMist },
  safe: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cream, padding: 24 },
  centerText: { color: Colors.muted, marginTop: 12 },
  loginPage: { flexGrow: 1, backgroundColor: Colors.primaryMist, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loginCard: { width: '100%', maxWidth: 470, backgroundColor: Colors.paper, borderRadius: 24, borderWidth: 1, borderColor: Colors.line, padding: 30, ...Shadows.card },
  loginBadge: { alignSelf: 'flex-start', backgroundColor: Colors.purpleSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginTop: 28 },
  loginBadgeText: { color: Colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  loginTitle: { color: Colors.ink, fontSize: 28, lineHeight: 35, fontWeight: '900', marginTop: 14 },
  loginSubtitle: { color: Colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 18 },
  backLink: { color: Colors.primaryDark, fontSize: 12, textAlign: 'center', fontWeight: '700', marginTop: 18 },
  app: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 245, backgroundColor: Colors.paper, borderRightWidth: 1, borderRightColor: Colors.line, paddingHorizontal: 17, paddingBottom: 20 },
  brand: { paddingVertical: 22, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: Colors.line, marginBottom: 21 },
  menuLabel: { color: '#8A9A90', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginHorizontal: 12, marginBottom: 9 },
  navItem: { minHeight: 46, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, marginBottom: 4 },
  navItemActive: { backgroundColor: Colors.primarySoft },
  navIcon: { color: Colors.primaryDark, width: 20, fontSize: 17 },
  navLabel: { color: Colors.muted, fontSize: 13, fontWeight: '700', flex: 1 },
  navLabelActive: { color: Colors.primaryDark, fontWeight: '900' },
  navBadge: { backgroundColor: Colors.primary, color: '#fff', fontSize: 9, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9 },
  sidebarBottom: { marginTop: 'auto', backgroundColor: Colors.yellowSoft, borderRadius: 14, padding: 15 },
  helpTitle: { color: Colors.ink, fontSize: 12, fontWeight: '800' },
  helpText: { color: Colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  main: { flex: 1, minWidth: 0 },
  topbar: { minHeight: 76, backgroundColor: Colors.paper, borderBottomWidth: 1, borderBottomColor: Colors.line, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  topbarCompact: { paddingHorizontal: 10, paddingVertical: 9, gap: 8 },
  topCopy: { flex: 1, minWidth: 120 },
  topTitle: { color: Colors.ink, fontSize: 17, fontWeight: '900' },
  breadcrumb: { color: Colors.muted, fontSize: 9, marginTop: 2 },
  siteButton: { borderWidth: 1, borderColor: Colors.line, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  siteButtonText: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800' },
  account: { maxWidth: 190 },
  accountEmail: { color: Colors.ink, fontSize: 10, fontWeight: '800' },
  accountRole: { color: Colors.purple, fontSize: 8, marginTop: 2 },
  signOutButton: { backgroundColor: Colors.redSoft, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  signOutText: { color: Colors.red, fontSize: 9, fontWeight: '800' },
  mobileNav: { paddingHorizontal: 18, paddingVertical: 11, gap: 8, backgroundColor: Colors.paper, flexDirection: 'row' },
  mobileNavCompact: { paddingHorizontal: 10, flexWrap: 'wrap' },
  mobilePill: { flex: 1, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: Colors.line },
  mobilePillCompact: { flexBasis: 82, flexGrow: 1, minWidth: 0 },
  mobilePillActive: { backgroundColor: Colors.primary },
  mobilePillText: { color: Colors.muted, fontSize: 11, fontWeight: '700' },
  mobilePillTextActive: { color: '#fff' },
  content: { width: '100%', maxWidth: 1150, alignSelf: 'center', padding: 25, paddingBottom: 80 },
  contentCompact: { paddingHorizontal: 12, paddingTop: 18 },
  welcome: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 },
  welcomeTitle: { color: Colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.7 },
  welcomeText: { color: Colors.muted, fontSize: 12, marginTop: 6 },
  caseManagerTabs: {
    flexDirection: 'row',
    gap: 10,
    padding: 6,
    marginBottom: 18,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 18,
    ...Shadows.card,
  },
  caseManagerTabsCompact: { flexDirection: 'column' },
  caseManagerTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  caseManagerTabCompact: { width: '100%', flexGrow: 0, flexBasis: 'auto' },
  caseManagerTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  caseManagerTabCopy: { flex: 1, minWidth: 0 },
  caseManagerTabTitle: { color: Colors.ink, fontSize: 12, fontWeight: '900' },
  caseManagerTabTitleActive: { color: '#fff' },
  caseManagerTabText: { color: Colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  caseManagerTabTextActive: { color: '#E6F4EC' },
  caseManagerTabBadge: {
    color: Colors.primaryDark,
    backgroundColor: Colors.primarySoft,
    minWidth: 26,
    textAlign: 'center',
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: '900',
    flexShrink: 0,
  },
  caseManagerTabBadgeActive: { color: Colors.primaryDark, backgroundColor: '#fff' },
  caseSetupIntro: {
    backgroundColor: Colors.purpleSoft,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  caseSetupCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0 },
  primaryButtonSmall: { backgroundColor: Colors.primary, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', marginTop: 15, minHeight: 48, justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stat: { flexGrow: 1, flexShrink: 1, flexBasis: 190, minWidth: 0, backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 16, padding: 18, ...Shadows.card },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statValue: { color: Colors.ink, fontSize: 26, fontWeight: '900' },
  statLabel: { color: Colors.muted, fontSize: 11, marginTop: 2 },
  guidePanel: { backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 18, padding: 20, marginTop: 18 },
  guideRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 18 },
  guide: { flexGrow: 1, flexShrink: 1, flexBasis: 230, minWidth: 0, flexDirection: 'row', gap: 12 },
  guideNumber: { width: 34, height: 34, borderRadius: 18, textAlign: 'center', textAlignVertical: 'center', backgroundColor: Colors.primarySoft, color: Colors.primaryDark, fontWeight: '900' },
  guideCopy: { flex: 1, minWidth: 0 },
  guideTitle: { color: Colors.ink, fontSize: 12, fontWeight: '900' },
  guideText: { color: Colors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 },
  panelTitle: { color: Colors.ink, fontSize: 15, fontWeight: '900' },
  panelSubtitle: { color: Colors.muted, fontSize: 10, marginTop: 4 },
  tablePanel: { backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 16, overflow: 'hidden' },
  tableHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  refreshText: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800' },
  listLoader: { margin: 35 },
  emptyText: { color: Colors.muted, textAlign: 'center', padding: 35 },
  caseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.line, flexWrap: 'wrap' },
  caseRowSelected: { backgroundColor: Colors.primarySoft },
  caseRowPressed: { opacity: 0.72 },
  caseThumb: { width: 48, height: 42, borderRadius: 9, backgroundColor: Colors.primarySoft },
  caseName: { flexGrow: 1, flexShrink: 1, flexBasis: 170, minWidth: 0 },
  rowTitle: { color: Colors.ink, fontSize: 12, fontWeight: '900' },
  rowSub: { color: Colors.muted, fontSize: 9, marginTop: 3 },
  status: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 8, fontWeight: '900' },
  rowDate: { flexShrink: 1, color: Colors.muted, fontSize: 9 },
  rowAction: { color: Colors.primaryDark, fontSize: 9, fontWeight: '900' },
  formCard: { backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 18, padding: 22, marginBottom: 18, ...Shadows.card },
  formHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 18 },
  formHeaderActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  secureLabel: { color: Colors.primaryDark, backgroundColor: Colors.primarySoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, fontSize: 9, fontWeight: '800' },
  cancelButton: { borderWidth: 1, borderColor: Colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.paper },
  cancelButtonText: { color: Colors.muted, fontSize: 9, fontWeight: '800' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { minWidth: 0, marginBottom: 15 },
  standaloneField: { width: '100%' },
  gridField: { flexGrow: 1, flexShrink: 1, flexBasis: 230, minWidth: 0 },
  loginField: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, width: '100%' },
  fieldLabel: { color: Colors.ink, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { width: '100%', minHeight: 46, borderWidth: 1, borderColor: Colors.line, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: Colors.ink, backgroundColor: '#FCFEFD', fontSize: 12, outlineStyle: 'none' } as any,
  multilineShort: { minHeight: 70 },
  multiline: { minHeight: 130 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderColor: Colors.line, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: Colors.paper },
  choiceActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  choiceText: { color: Colors.muted, fontSize: 10, fontWeight: '700' },
  choiceTextActive: { color: Colors.primaryDark, fontWeight: '900' },
  imageSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 15 },
  imageActions: { flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0, width: '100%' },
  uploadButton: { alignSelf: 'flex-start', backgroundColor: Colors.purpleSoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  uploadButtonText: { color: Colors.purple, fontSize: 10, fontWeight: '900' },
  orText: { color: Colors.muted, fontSize: 9, marginVertical: 8 },
  imagePreview: { width: 240, height: 145, borderRadius: 14, backgroundColor: Colors.primarySoft },
  imagePlaceholder: { width: 240, height: 145, borderRadius: 14, backgroundColor: Colors.primaryMist, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: Colors.muted, fontSize: 10 },
  optionRow: { flexDirection: 'row', marginBottom: 15 },
  checkOption: { borderWidth: 1, borderColor: Colors.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  checkOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  checkText: { color: Colors.muted, fontSize: 10, fontWeight: '700' },
  checkTextActive: { color: Colors.primaryDark, fontWeight: '900' },
  publishNotice: { color: Colors.orange, backgroundColor: Colors.orangeSoft, borderRadius: 10, padding: 11, fontSize: 10, fontWeight: '700', marginBottom: 10 },
  errorBox: { color: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 10, padding: 11, fontSize: 11, lineHeight: 17, marginTop: 10 },
  successBox: { color: Colors.primaryDark, backgroundColor: Colors.primarySoft, borderRadius: 10, padding: 11, fontSize: 11, marginTop: 10 },
  galleryManager: { borderWidth: 1, borderColor: Colors.line, borderRadius: 16, padding: 16, marginBottom: 18, backgroundColor: Colors.primaryMist },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  galleryHelp: { color: Colors.muted, fontSize: 10, marginTop: 4 },
  videoManager: { borderWidth: 1, borderColor: Colors.line, borderRadius: 16, padding: 16, marginBottom: 18, backgroundColor: Colors.purpleSoft },
  videoHeading: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  videoSourceChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 13 },
  videoUploadButton: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  videoUploadButtonText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  videoFileName: { color: Colors.muted, fontSize: 10, marginTop: 8, marginBottom: 12 },
  videoTitleInput: { marginTop: 10 },
  videoPreview: { width: '100%', maxWidth: 720, marginTop: 14 },
  videoPreviewLabel: { color: Colors.ink, fontSize: 11, fontWeight: '900', marginBottom: 8 },
  videoInvalidText: { color: Colors.orange, fontSize: 10, lineHeight: 16, marginTop: 10 },
  videoRetainedText: { color: Colors.purple, fontSize: 10, lineHeight: 16, marginTop: 4 },
  videoDeleteButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 13 },
  videoDeleteButtonText: { color: Colors.red, fontSize: 10, fontWeight: '900' },
  imagePlaceholderWide: { minHeight: 120, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper },
  adminGalleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  adminImageCard: { width: 270, maxWidth: '100%', backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 14, padding: 10 },
  adminImageCardCover: { borderColor: Colors.primary, borderWidth: 2 },
  adminImageWrap: { height: 145, borderRadius: 11, overflow: 'hidden', position: 'relative', backgroundColor: Colors.primarySoft },
  adminImage: { width: '100%', height: '100%' },
  imageOrder: { position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', backgroundColor: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: 10, fontWeight: '900' },
  coverBadge: { position: 'absolute', right: 8, top: 8, color: Colors.primaryDark, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, fontSize: 8, fontWeight: '900' },
  coverButton: { borderWidth: 1, borderColor: Colors.line, borderRadius: 9, padding: 9, alignItems: 'center', marginTop: 9 },
  coverButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  coverButtonText: { color: Colors.muted, fontSize: 9, fontWeight: '800' },
  coverButtonTextActive: { color: Colors.primaryDark },
  imageInput: { borderWidth: 1, borderColor: Colors.line, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, color: Colors.ink, backgroundColor: '#FCFEFD', fontSize: 10, marginTop: 8, outlineStyle: 'none' } as any,
  imageCardActions: { flexDirection: 'row', gap: 7, marginTop: 9 },
  orderButton: { width: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.yellowSoft },
  orderButtonText: { color: Colors.ink, fontSize: 14, fontWeight: '900' },
  removeImageButton: { flex: 1, backgroundColor: Colors.redSoft, borderRadius: 8, padding: 9, alignItems: 'center' },
  removeImageText: { color: Colors.red, fontSize: 9, fontWeight: '900' },
  categoryManager: { backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line, borderRadius: 18, padding: 18, marginBottom: 18, ...Shadows.card },
  categoryManagerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  categoryCount: { color: Colors.purple, backgroundColor: Colors.purpleSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, fontSize: 9, fontWeight: '900' },
  addCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 15 },
  addCategoryRowMobile: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch', gap: 10 },
  categoryInput: { flex: 1, minWidth: 220, borderWidth: 1, borderColor: Colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.ink, backgroundColor: '#FCFEFD', fontSize: 11, outlineStyle: 'none' } as any,
  categoryInputMobile: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, width: '100%', minHeight: 46 },
  addCategoryButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, justifyContent: 'center' },
  addCategoryButtonMobile: { width: '100%', minHeight: 46, alignItems: 'center', alignSelf: 'stretch' },
  addCategoryButtonText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  categoryListMobile: { marginTop: 18 },
  categoryItem: { minWidth: 235, flex: 1, maxWidth: 360, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: Colors.primaryMist },
  categoryItemMobile: { minWidth: 0, width: '100%', maxWidth: '100%', flexBasis: '100%', flexGrow: 0 },
  categoryNameWrap: { flex: 1 },
  categoryName: { color: Colors.ink, fontSize: 11, fontWeight: '900' },
  categoryUsage: { color: Colors.muted, fontSize: 8, marginTop: 3 },
  categoryEditInput: { flex: 1, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, color: Colors.ink, backgroundColor: Colors.paper, fontSize: 10, outlineStyle: 'none' } as any,
  categoryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center', justifyContent: 'flex-end' },
  categoryEditButton: { backgroundColor: Colors.yellowSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  categoryEditText: { color: Colors.ink, fontSize: 8, fontWeight: '900' },
  categoryDeleteButton: { backgroundColor: Colors.redSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  categoryDeleteConfirm: { backgroundColor: Colors.red },
  categoryDeleteText: { color: Colors.red, fontSize: 8, fontWeight: '900' },
  categoryDeleteConfirmText: { color: '#fff' },
  categorySaveButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  categorySaveText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  categoryCancelButton: { borderWidth: 1, borderColor: Colors.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  categoryCancelText: { color: Colors.muted, fontSize: 8, fontWeight: '900' },
  priorityAddArea: { marginTop: 2 },
  colorChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  colorChoice: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorChoiceActive: { borderColor: Colors.ink, transform: [{ scale: 1.1 }] },
  priorityItem: { minWidth: 300, flex: 1, maxWidth: 530, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: Colors.primaryMist },
  priorityItemMobile: { minWidth: 0, width: '100%', maxWidth: '100%', flexBasis: '100%', flexGrow: 0, flexWrap: 'wrap' },
  priorityEditArea: { flexGrow: 1, flexShrink: 1, flexBasis: 175, minWidth: 0 },
  priorityPreviewRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  priorityPreview: { alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  priorityPreviewText: { fontSize: 9, fontWeight: '900' },
  pinnedBadge: { color: Colors.purple, backgroundColor: Colors.purpleSoft, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, fontSize: 8, fontWeight: '900' },
  topToggle: { alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.line, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, marginTop: 10, backgroundColor: Colors.paper },
  topToggleActive: { borderColor: Colors.purple, backgroundColor: Colors.purpleSoft },
  topToggleText: { color: Colors.muted, fontSize: 9, fontWeight: '800' },
  topToggleTextActive: { color: Colors.purple },
  directTopButton: { borderWidth: 1, borderColor: Colors.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: Colors.paper },
  directTopButtonActive: { borderColor: Colors.purple, backgroundColor: Colors.purpleSoft },
  directTopText: { color: Colors.muted, fontSize: 8, fontWeight: '900' },
  directTopTextActive: { color: Colors.purple },
  priorityChoice: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 2, borderColor: 'transparent' },
  priorityChoiceActive: { borderColor: Colors.ink },
  priorityChoiceText: { fontSize: 10, fontWeight: '900' },
  moneyPreview: { color: Colors.primaryDark, fontSize: 11, fontWeight: '900', marginTop: 6 },
});
