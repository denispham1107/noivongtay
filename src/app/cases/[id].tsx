import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PublicHeader } from '@/components/public-header';
import { Text, TextInput } from '@/components/fixed-text';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { Colors, Shadows } from '@/constants/brand';
import { getCaseImages } from '@/data/cases';
import { useCasePriorities } from '@/hooks/use-case-priorities';
import { usePublishedCases } from '@/hooks/use-published-cases';
import { auth } from '@/services/firebase';
import { defaultCasePriorities, priorityTextColor } from '@/services/priorities';
import { SavedCaseRequiresAuthError, subscribeSavedCases, toggleSavedCase } from '@/services/saved-cases';
import { getCaseSupportHistory, supportCharityCase, type SupportTransaction } from '@/services/support';
import { getCurrentUserProfile, type AppUser } from '@/services/users';
import { formatMoney, formatMoneyInput, formatSupportDateTime, normalizeMoney } from '@/utils/currency';

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cases, loading, error, refresh } = usePublishedCases();
  const { priorities } = useCasePriorities();
  const item = cases.find((entry) => entry.id === id);
  const priorityOption = item ? priorities.find((entry) => entry.name === item.priority) || defaultCasePriorities.find((entry) => entry.name === item.priority) : undefined;
  const { width } = useWindowDimensions();
  const desktop = width >= 800;
  const galleryWidth = Math.max(280, Math.min(width - 40, desktop ? 742 : 900));
  const galleryRef = useRef<ScrollView>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [supportAmount, setSupportAmount] = useState('');
  const [supporting, setSupporting] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState('');
  const [supportHistory, setSupportHistory] = useState<SupportTransaction[]>([]);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');
  const images = item ? getCaseImages(item) : [];

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setProfile(currentUser ? await getCurrentUserProfile(currentUser.uid).catch(() => null) : null);
  }), []);

  useEffect(() => subscribeSavedCases((ids) => setSaved(ids.includes(String(id)))), [id]);

  useEffect(() => {
    if (!item) return;
    setReceivedAmount(Number(item.receivedAmount ?? 0));
    void getCaseSupportHistory(item.id).then(setSupportHistory).catch(() => setSupportHistory([]));
  }, [item?.id, item?.receivedAmount]);

  useEffect(() => {
    if (!item || !images.length) return;
    const coverIndex = images.findIndex((entry) => entry.id === item.coverImageId);
    const nextIndex = Math.max(0, coverIndex);
    setActiveImage(nextIndex);
    galleryRef.current?.scrollTo({ x: nextIndex * galleryWidth, animated: false });
  }, [item?.id, item?.coverImageId, images.length, galleryWidth]);

  const showImage = (index: number) => {
    const next = Math.max(0, Math.min(images.length - 1, index));
    setActiveImage(next);
    galleryRef.current?.scrollTo({ x: next * galleryWidth, animated: true });
  };

  const getPublicCaseUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.href;
    const publicSite = process.env.EXPO_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
    return publicSite ? `${publicSite}/cases/${encodeURIComponent(String(id))}` : Linking.createURL(`/cases/${String(id)}`);
  };

  const shareCase = async () => {
    if (!item || sharing) return;
    setSharing(true);
    setShareFeedback('');
    const url = getPublicCaseUrl();
    const title = `Cùng lắng nghe câu chuyện của ${item.name}`;
    const message = `${title}\n${item.summary}\n${url}`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title, text: item.summary, url });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
          setShareFeedback('✓ Đã sao chép liên kết hồ sơ.');
        } else {
          setShareFeedback(`Hãy sao chép liên kết: ${url}`);
        }
      } else {
        await Share.share(Platform.OS === 'ios' ? { title, message: `${title}\n${item.summary}`, url } : { title, message });
      }
    } catch (reason) {
      const name = reason instanceof Error ? reason.name : '';
      if (name !== 'AbortError') setShareFeedback('Không thể chia sẻ lúc này. Vui lòng thử lại.');
    } finally {
      setSharing(false);
    }
  };

  const sendSupport = async () => {
    if (!item) return;
    if (!auth.currentUser || profile?.role !== 'user') {
      router.push('/account');
      return;
    }
    const amount = normalizeMoney(supportAmount);
    if (amount === null || amount <= 0) {
      setSupportFeedback('Hãy nhập số tiền hỗ trợ lớn hơn 0.');
      return;
    }
    if (amount > profile.balance) {
      setSupportFeedback('Số dư hiện tại không đủ để thực hiện hỗ trợ.');
      return;
    }

    setSupporting(true);
    setSupportFeedback('');
    try {
      const result = await supportCharityCase(item.id, amount);
      setProfile({ ...profile, balance: result.balance });
      setReceivedAmount(result.receivedAmount);
      setSupportAmount('');
      setSupportFeedback(`Cảm ơn bạn đã hỗ trợ ${formatMoney(amount)}.`);
      setSupportHistory(await getCaseSupportHistory(item.id));
      await refresh();
    } catch (reason) {
      setSupportFeedback(reason instanceof Error ? reason.message : 'Không thể chuyển tiền hỗ trợ lúc này.');
    } finally {
      setSupporting(false);
    }
  };

  const saveForLater = async () => {
    if (!item) return;
    setSaveFeedback('');
    if (!auth.currentUser) {
      router.push('/account');
      return;
    }
    try {
      const nextSaved = await toggleSavedCase(item.id);
      setSaveFeedback(nextSaved ? 'Đã lưu hồ sơ vào tài khoản của bạn.' : 'Đã bỏ hồ sơ khỏi danh sách đã lưu.');
    } catch (reason) {
      if (reason instanceof SavedCaseRequiresAuthError) {
        router.push('/account');
        return;
      }
      setSaveFeedback('Không thể cập nhật danh sách đã lưu. Vui lòng thử lại.');
    }
  };

  if (loading) return <SafeAreaView style={styles.center}><Text style={styles.centerText}>Đang tải hồ sơ…</Text></SafeAreaView>;
  if (!item) return <SafeAreaView style={styles.center}><Text style={styles.notFound}>Không tìm thấy hồ sơ</Text><Text style={styles.centerText}>{error || 'Hồ sơ chưa được xuất bản hoặc đã bị gỡ.'}</Text><Pressable onPress={() => router.replace('/explore')}><Text style={styles.back}>← Quay lại danh sách</Text></Pressable></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top']}><PublicHeader /><KeyboardAwareScrollView contentContainerStyle={styles.page}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Quay lại danh sách</Text></Pressable>
    <View style={[styles.layout, desktop && styles.layoutDesktop]}>
      <View style={styles.main}>
        <View style={[styles.gallery, { width: galleryWidth }]}>
          <ScrollView ref={galleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setActiveImage(Math.round(event.nativeEvent.contentOffset.x / galleryWidth))}>
            {images.map((entry) => <Pressable key={entry.id} onPress={() => setViewerOpen(true)} style={{ width: galleryWidth }}><Image source={entry.url} style={[styles.heroImage, !desktop && styles.heroImageMobile]} contentFit="cover" transition={250} alt={entry.altText || `Hình ảnh của ${item.name}`} /></Pressable>)}
          </ScrollView>
          <View style={styles.imageCounter}><Text style={styles.imageCounterText}>▣ {activeImage + 1}/{images.length}</Text></View>
          {images.length > 1 && <><Pressable accessibilityLabel="Ảnh trước" disabled={activeImage === 0} onPress={() => showImage(activeImage - 1)} style={[styles.galleryArrow, styles.galleryArrowLeft, activeImage === 0 && styles.arrowDisabled]}><Text style={styles.galleryArrowText}>‹</Text></Pressable><Pressable accessibilityLabel="Ảnh tiếp theo" disabled={activeImage === images.length - 1} onPress={() => showImage(activeImage + 1)} style={[styles.galleryArrow, styles.galleryArrowRight, activeImage === images.length - 1 && styles.arrowDisabled]}><Text style={styles.galleryArrowText}>›</Text></Pressable></>}
        </View>
        {!!images[activeImage]?.caption && <Text style={styles.imageCaption}>{images[activeImage].caption}</Text>}
        {images.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>{images.map((entry, index) => <Pressable key={entry.id} accessibilityLabel={`Xem ảnh ${index + 1}`} onPress={() => showImage(index)} style={[styles.thumbnailButton, index === activeImage && styles.thumbnailButtonActive]}><Image source={entry.url} style={styles.thumbnail} contentFit="cover" /></Pressable>)}</ScrollView>}
        <View style={styles.meta}><Text style={styles.category}>{item.category}</Text><Text style={styles.location}>⌖ {item.location}</Text><Text style={styles.verified}>✓ Đã xác minh</Text><Text style={[styles.priorityBadge, { backgroundColor: priorityOption?.color || Colors.green, color: priorityTextColor(priorityOption?.color || Colors.green) }]}>● {item.priority}</Text></View>
        <Text style={styles.title}>{item.name}</Text><Text style={styles.lead}>{item.summary}</Text>
        <View style={styles.divider} /><Text style={styles.heading}>Câu chuyện</Text><Text style={styles.story}>{item.story}</Text>
        <View style={styles.notice}><Text style={styles.noticeIcon}>⌾</Text><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>Thông tin được bảo vệ</Text><Text style={styles.noticeText}>Các chi tiết nhận dạng và giấy tờ xác minh chỉ được lưu trong khu vực quản trị, không công khai.</Text></View></View>
      </View>
      <View style={[styles.side, desktop && styles.sideDesktop]}>
        <Text style={styles.sideEyebrow}>ĐÃ NHẬN HỖ TRỢ</Text>
        <Text style={styles.receivedAmount}>{formatMoney(receivedAmount)}</Text>
        <Text style={styles.receivedLabel}>Tổng số tiền hồ sơ đã nhận từ cộng đồng.</Text>
        <View style={styles.supportBox}>
          <Text style={styles.supportBalance}>Số tiền nạp của bạn: {formatMoney(profile?.balance ?? 0)}</Text>
          <TextInput value={supportAmount} onChangeText={(value) => setSupportAmount(formatMoneyInput(value))} keyboardType="number-pad" placeholder="Nhập số tiền muốn hỗ trợ" style={styles.supportInput} />
          <Pressable disabled={supporting} onPress={sendSupport} style={[styles.supportButton, supporting && styles.shareDisabled]}>{supporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{profile?.role === 'user' ? 'Chuyển tiền hỗ trợ' : 'Đăng nhập để hỗ trợ'}</Text>}</Pressable>
          {!!supportFeedback && <Text style={styles.supportFeedback}>{supportFeedback}</Text>}
        </View>
        <View style={styles.progressTrack}><View style={[styles.progress, { width: `${item.progress}%` }]} /></View>
        <View style={styles.progressRow}><Text style={styles.progressValue}>{item.progress}%</Text><Text style={styles.progressLabel}>{item.supporters} người quan tâm</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Chia sẻ hồ sơ ${item.name}`} disabled={sharing} style={[styles.primary, sharing && styles.shareDisabled]} onPress={shareCase}><Text style={styles.primaryText}>{sharing ? 'Đang mở chia sẻ…' : 'Chia sẻ câu chuyện này'}</Text></Pressable>
        {!!shareFeedback && <Text selectable style={styles.shareFeedback}>{shareFeedback}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: saved }} onPress={saveForLater} style={[styles.secondary, saved && styles.secondarySaved]}><Text style={[styles.secondaryText, saved && styles.secondaryTextSaved]}>{saved ? '✓ Đã lưu để xem sau' : '◇ Lưu để xem sau'}</Text></Pressable>
        {!!saveFeedback && <Text style={styles.saveFeedback}>{saveFeedback}</Text>}
        <Text style={styles.updated}>Cập nhật lần cuối: {item.updated}</Text>
      </View>
    </View>
    <View style={styles.historyPanel}>
      <Text style={styles.historyTitle}>Lịch sử nhận tiền</Text>
      <Text style={styles.historySubtitle}>Thời gian được hiển thị theo định dạng 24 giờ.</Text>
      {supportHistory.length === 0 ? <Text style={styles.historyEmpty}>Hồ sơ chưa có giao dịch hỗ trợ nào.</Text> : supportHistory.map((entry) => <View key={entry.id} style={styles.historyRow}><View style={styles.historyCopy}><Text style={styles.historyName}>{entry.userName}</Text><Text style={styles.historyTime}>{formatSupportDateTime(entry.createdAt)}</Text>{entry.type === 'admin_adjustment' && <Text style={styles.adjustmentLabel}>Điều chỉnh bởi quản trị</Text>}</View><Text style={[styles.historyAmount, entry.amount < 0 && styles.negativeAmount]}>{entry.amount > 0 ? '+' : ''}{formatMoney(entry.amount)}</Text></View>)}
    </View>
    <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}><View style={styles.viewer}><Pressable accessibilityLabel="Đóng trình xem ảnh" style={styles.viewerClose} onPress={() => setViewerOpen(false)}><Text style={styles.viewerCloseText}>✕</Text></Pressable><Image source={images[activeImage]?.url} style={styles.viewerImage} contentFit="contain" alt={images[activeImage]?.altText || `Hình ảnh của ${item.name}`} /><Text style={styles.viewerCount}>{activeImage + 1}/{images.length}</Text>{!!images[activeImage]?.caption && <Text style={styles.viewerCaption}>{images[activeImage].caption}</Text>}{images.length > 1 && <><Pressable disabled={activeImage === 0} onPress={() => showImage(activeImage - 1)} style={[styles.viewerArrow, styles.viewerLeft, activeImage === 0 && styles.arrowDisabled]}><Text style={styles.viewerArrowText}>‹</Text></Pressable><Pressable disabled={activeImage === images.length - 1} onPress={() => showImage(activeImage + 1)} style={[styles.viewerArrow, styles.viewerRight, activeImage === images.length - 1 && styles.arrowDisabled]}><Text style={styles.viewerArrowText}>›</Text></Pressable></>}</View></Modal>
  </KeyboardAwareScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', padding: 24 }, centerText: { color: Colors.muted, fontSize: 13, marginTop: 8, marginBottom: 18, textAlign: 'center' }, notFound: { color: Colors.ink, fontSize: 24, fontWeight: '900' },
  safe: { flex: 1, backgroundColor: Colors.cream }, page: { maxWidth: 1120, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 34 }, back: { color: Colors.primaryDark, fontSize: 13, fontWeight: '700', marginBottom: 24 }, layout: { gap: 25 }, layoutDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 38 }, main: { flex: 1 }, gallery: { borderRadius: 24, overflow: 'hidden', position: 'relative', backgroundColor: Colors.primarySoft }, heroImage: { width: '100%', height: 430, backgroundColor: Colors.primarySoft }, heroImageMobile: { height: 285 }, imageCounter: { position: 'absolute', right: 14, top: 14, backgroundColor: 'rgba(16,52,34,0.78)', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 }, imageCounterText: { color: '#fff', fontSize: 11, fontWeight: '800' }, galleryArrow: { position: 'absolute', top: '45%', width: 40, height: 48, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.9)' }, galleryArrowLeft: { left: 12 }, galleryArrowRight: { right: 12 }, galleryArrowText: { color: Colors.ink, fontSize: 31, lineHeight: 34 }, arrowDisabled: { opacity: 0.25 }, imageCaption: { color: Colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10, fontStyle: 'italic' }, thumbnails: { gap: 9, paddingTop: 12, paddingBottom: 2 }, thumbnailButton: { width: 82, height: 62, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' }, thumbnailButtonActive: { borderColor: Colors.primary }, thumbnail: { width: '100%', height: '100%' }, meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22, alignItems: 'center' }, category: { color: Colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, location: { color: Colors.muted, fontSize: 12, fontWeight: '800' }, verified: { color: Colors.green, backgroundColor: Colors.greenSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '700' }, title: { color: Colors.ink, fontSize: 40, fontWeight: '900', letterSpacing: -1.5, marginTop: 14 }, lead: { color: Colors.muted, fontSize: 18, lineHeight: 28, marginTop: 10 }, divider: { height: 1, backgroundColor: Colors.line, marginVertical: 28 }, heading: { color: Colors.ink, fontSize: 23, fontWeight: '900' }, story: { color: Colors.muted, fontSize: 15, lineHeight: 26, marginTop: 12 }, notice: { flexDirection: 'row', gap: 12, backgroundColor: Colors.greenSoft, borderRadius: 16, padding: 17, marginTop: 25 }, noticeIcon: { color: Colors.green, fontSize: 22 }, noticeTitle: { color: Colors.ink, fontWeight: '800', fontSize: 13 }, noticeText: { color: Colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, side: { width: '100%', backgroundColor: '#fff', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: Colors.line, ...Shadows.card }, sideDesktop: { maxWidth: 340 }, sideEyebrow: { color: Colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, sideTitle: { color: Colors.ink, fontSize: 21, lineHeight: 29, fontWeight: '900', marginTop: 9 }, progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#DDECE3', marginTop: 24 }, progress: { height: '100%', borderRadius: 5, backgroundColor: Colors.primary }, progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }, progressValue: { color: Colors.primaryDark, fontSize: 18, fontWeight: '900' }, progressLabel: { color: Colors.muted, fontSize: 11 }, primary: { backgroundColor: Colors.primary, borderRadius: 13, alignItems: 'center', padding: 15, marginTop: 22 }, shareDisabled: { opacity: 0.65 }, primaryText: { color: '#fff', fontSize: 13, fontWeight: '800' }, shareFeedback: { color: Colors.primaryDark, backgroundColor: Colors.greenSoft, borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 16, marginTop: 9, textAlign: 'center' }, secondary: { borderWidth: 1, borderColor: '#F2C5D8', backgroundColor: Colors.pinkSoft, borderRadius: 13, alignItems: 'center', padding: 14, marginTop: 10 }, secondaryText: { color: Colors.pink, fontSize: 13, fontWeight: '800' }, updated: { color: '#819187', fontSize: 10, textAlign: 'center', marginTop: 17 }, viewer: { flex: 1, backgroundColor: 'rgba(5,15,10,0.96)', alignItems: 'center', justifyContent: 'center', padding: 20 }, viewerImage: { width: '92%', height: '78%' }, viewerClose: { position: 'absolute', right: 20, top: 20, zIndex: 3, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }, viewerCloseText: { color: '#fff', fontSize: 20 }, viewerCount: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 10 }, viewerCaption: { color: '#DDECE3', fontSize: 13, textAlign: 'center', marginTop: 8, maxWidth: 700 }, viewerArrow: { position: 'absolute', top: '46%', width: 48, height: 58, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }, viewerLeft: { left: 15 }, viewerRight: { right: 15 }, viewerArrowText: { color: '#fff', fontSize: 38 },
  secondarySaved: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  secondaryTextSaved: { color: Colors.primaryDark },
  saveFeedback: { color: Colors.primaryDark, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 7 },
  priorityBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '800' },
  receivedAmount: { color: Colors.ink, fontSize: 32, fontWeight: '900', marginTop: 7 },
  receivedLabel: { color: Colors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 },
  supportBox: { backgroundColor: Colors.primarySoft, borderRadius: 14, padding: 13, marginTop: 16 },
  supportBalance: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800' },
  supportInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderRadius: 10, color: Colors.ink, fontSize: 12, paddingHorizontal: 12, paddingVertical: 11, marginTop: 9 },
  supportButton: { minHeight: 45, backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 9 },
  supportFeedback: { color: Colors.primaryDark, fontSize: 10, lineHeight: 15, marginTop: 8, textAlign: 'center' },
  historyPanel: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderRadius: 22, padding: 22, marginTop: 28, ...Shadows.card },
  historyTitle: { color: Colors.ink, fontSize: 21, fontWeight: '900' },
  historySubtitle: { color: Colors.muted, fontSize: 10, marginTop: 4, marginBottom: 13 },
  historyEmpty: { color: Colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: 20 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: Colors.line },
  historyCopy: { flex: 1 },
  historyName: { color: Colors.ink, fontSize: 12, fontWeight: '800' },
  historyTime: { color: Colors.muted, fontSize: 10, marginTop: 3 },
  adjustmentLabel: { color: Colors.purple, fontSize: 9, fontWeight: '700', marginTop: 3 },
  historyAmount: { color: Colors.primaryDark, fontSize: 15, fontWeight: '900' },
  negativeAmount: { color: Colors.red },
});
