import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaseCard } from '@/components/case-card';
import { Text, TextInput } from '@/components/fixed-text';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { PublicHeader } from '@/components/public-header';
import { Colors } from '@/constants/brand';
import { useCaseCategories } from '@/hooks/use-case-categories';
import { useCasePriorities } from '@/hooks/use-case-priorities';
import { usePublishedCases } from '@/hooks/use-published-cases';
import { sortCasesByPriority } from '@/services/priorities';
import { getCoverImage } from '@/data/cases';

const accentPills = [
  { backgroundColor: Colors.orangeSoft, borderColor: '#F8CBAE' },
  { backgroundColor: Colors.purpleSoft, borderColor: '#DCCCF2' },
  { backgroundColor: Colors.yellowSoft, borderColor: '#F0DF9B' },
  { backgroundColor: Colors.pinkSoft, borderColor: '#F2C5D8' },
];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 760;
  const wideDesktop = Platform.OS === 'web' && width >= 1100;
  const { cases, loading, error } = usePublishedCases();
  const { categories: categoryOptions } = useCaseCategories();
  const { priorities } = useCasePriorities();
  const categories = ['Tất cả', ...categoryOptions.map((item) => item.name)];
  const sortedCases = sortCasesByPriority(cases, priorities);
  const featured = sortedCases.slice(0, desktop ? 3 : 2);
  const heroPhotos = featured.slice(0, 2).map((item) => ({
    id: item.id,
    name: item.name,
    url: getCoverImage(item)?.url || item.image,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PublicHeader />
      <KeyboardAwareScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroOuter, wideDesktop && styles.heroOuterWide]}>
          <View style={[styles.hero, desktop && styles.heroDesktop, wideDesktop && styles.heroDesktopWide]}>
            <View style={[styles.heroCopy, wideDesktop && styles.heroCopyWide]}>
              <View style={styles.eyebrow}><Text style={styles.eyebrowText}>♥  CÙNG NHAU TẠO NÊN THAY ĐỔI</Text></View>
              <Text style={[styles.heroTitle, desktop && styles.heroTitleDesktop, wideDesktop && styles.heroTitleWide]}>Một vòng tay mở ra,{`\n`}một hy vọng bắt đầu.</Text>
              <Text style={styles.heroBody}>Kết nối những hoàn cảnh đang cần giúp đỡ với những tấm lòng sẵn sàng sẻ chia — minh bạch, tử tế và đầy yêu thương.</Text>
              <View style={[styles.search, !desktop && styles.searchMobile]}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput placeholder="Tìm theo tên, khu vực hoặc câu chuyện..." placeholderTextColor="#A3948D" style={styles.searchInput} accessibilityLabel="Tìm kiếm hoàn cảnh" />
                <Pressable style={styles.searchButton} onPress={() => router.push('/explore')}><Text style={styles.searchButtonText}>Tìm kiếm</Text></Pressable>
              </View>
              <View style={styles.trustRow}>
                <Text style={styles.trustText}>✓ Thông tin được xác minh</Text>
                <Text style={styles.trustText}>♡ Tôn trọng và bảo mật</Text>
              </View>
            </View>
            {wideDesktop ? (
              <View style={styles.heroVisualWide}>
                <Image source={require('../../assets/images/hero-community-desktop.png')} style={styles.heroVisualImage} contentFit="cover" transition={250} alt="Những bàn tay cùng nâng niu chiếc lá hình trái tim" />
                {heroPhotos[0] && (
                  <View style={[styles.storyPhoto, styles.storyPhotoLeft]}>
                    <Image source={heroPhotos[0].url} style={styles.storyPhotoImage} contentFit="cover" alt={`Hoàn cảnh ${heroPhotos[0].name}`} />
                  </View>
                )}
                {heroPhotos[1] && (
                  <View style={[styles.storyPhoto, styles.storyPhotoRight]}>
                    <Image source={heroPhotos[1].url} style={styles.storyPhotoImage} contentFit="cover" alt={`Hoàn cảnh ${heroPhotos[1].name}`} />
                  </View>
                )}
                <View style={styles.quoteCardWide}>
                  <Text style={styles.quoteMark}>“</Text>
                  <View style={styles.quoteCopyWide}>
                    <Text style={styles.quoteWide}>“Sự tử tế, dù nhỏ bé, cũng chưa bao giờ là lãng phí.”</Text>
                    <Text style={styles.quoteAuthorWide}>— Aesop</Text>
                  </View>
                </View>
                <View style={styles.communityRowWide}>
                  <View style={styles.avatarStack}>
                    {heroPhotos.map((photo) => <Image key={photo.id} source={photo.url} style={styles.communityAvatar} contentFit="cover" alt={photo.name} />)}
                    <View style={styles.communityAvatarFallback}><Text style={styles.communityAvatarHeart}>♥</Text></View>
                  </View>
                  <Text style={styles.communityCount}><Text style={styles.communityCountStrong}>2.480+</Text> tấm lòng đã kết nối</Text>
                </View>
              </View>
            ) : desktop && (
              <View style={styles.heroArt}>
                <View style={styles.sun} />
                <Text style={styles.artHeart}>♥</Text>
                <View style={styles.artCard}>
                  <Text style={styles.quote}>“Sự tử tế, dù nhỏ bé, cũng chưa bao giờ là lãng phí.”</Text>
                  <Text style={styles.quoteAuthor}>— Aesop</Text>
                </View>
                <View style={styles.peopleRow}>
                  <View style={styles.people}>
                    <View style={[styles.peopleDot, { backgroundColor: Colors.primary }]} />
                    <View style={[styles.peopleDot, { backgroundColor: Colors.orange }]} />
                    <View style={[styles.peopleDot, { backgroundColor: Colors.purple }]} />
                    <View style={[styles.peopleDot, { backgroundColor: Colors.pink }]} />
                  </View>
                  <Text style={styles.peopleText}>2.480+ tấm lòng đã kết nối</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.categoryRow}>
            {categories.map((category, index) => (
              <Pressable key={category} style={[styles.categoryPill, index === 0 ? styles.categoryPillActive : accentPills[(index - 1) % accentPills.length]]} onPress={() => router.push('/explore')}>
                <Text style={[styles.categoryText, index === 0 && styles.categoryTextActive]}>{category}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionEyebrow}>ĐANG CẦN SỰ CHUNG TAY</Text>
              <Text style={styles.sectionTitle}>Những câu chuyện cần được lắng nghe</Text>
            </View>
            {desktop && <Pressable onPress={() => router.push('/explore')}><Text style={styles.viewAll}>Xem tất cả  →</Text></Pressable>}
          </View>
          {loading ? <Text style={styles.dataMessage}>Đang tải các hoàn cảnh…</Text> : error ? <Text style={styles.dataError}>Không thể tải dữ liệu: {error}</Text> : featured.length === 0 ? <Text style={styles.dataMessage}>Chưa có hoàn cảnh nào được xuất bản.</Text> : <View style={[styles.grid, !desktop && styles.gridMobile]}>{featured.map((item) => <CaseCard key={item.id} item={item} priorityOption={priorities.find((entry) => entry.name === item.priority)} />)}</View>}
          {!desktop && <Pressable style={styles.outlineButton} onPress={() => router.push('/explore')}><Text style={styles.outlineText}>Xem tất cả hoàn cảnh  →</Text></Pressable>}

          <View style={[styles.howSection, desktop && styles.howDesktop]}>
            <View style={styles.howIntro}>
              <Text style={styles.sectionEyebrow}>MINH BẠCH TRONG TỪNG KẾT NỐI</Text>
              <Text style={styles.howTitle}>Mỗi câu chuyện đều được nâng niu và xác minh.</Text>
              <Text style={styles.howBody}>Chúng tôi đặt sự tôn trọng, minh bạch và an toàn của người cần hỗ trợ lên hàng đầu.</Text>
            </View>
            <View style={styles.steps}>
              <Step number="01" title="Tiếp nhận" text="Thông tin được tiếp nhận từ cộng đồng và đối tác địa phương." />
              <Step number="02" title="Xác minh" text="Đội ngũ kiểm tra, liên hệ và bảo vệ dữ liệu nhạy cảm." />
              <Step number="03" title="Kết nối" text="Câu chuyện được chia sẻ rõ ràng đến những tấm lòng đồng hành." />
            </View>
          </View>
        </View>

        <View style={styles.footer}><Text style={styles.footerHeart}>♥</Text><Text style={styles.footerText}>Nối Vòng Tay · Cùng gieo những điều tử tế</Text></View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <View style={styles.step}><Text style={styles.stepNumber}>{number}</Text><View style={styles.stepContent}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  page: { flexGrow: 1 },
  heroOuter: { backgroundColor: '#EAF7EF', borderBottomWidth: 1, borderBottomColor: '#D6ECDE' },
  heroOuterWide: { backgroundColor: '#F8FBF7' },
  hero: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 55 },
  heroDesktop: { flexDirection: 'row', minHeight: 500, alignItems: 'center', gap: 70, paddingVertical: 70 },
  heroDesktopWide: { maxWidth: 1440, minHeight: 520, gap: 36, paddingHorizontal: 32, paddingVertical: 44 },
  heroCopy: { flex: 1, width: '100%', maxWidth: 650, minWidth: 0 },
  heroCopyWide: { flex: 0.92, maxWidth: 620, paddingLeft: 8 },
  eyebrow: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, marginBottom: 18 },
  eyebrowText: { color: Colors.coralDark, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: Colors.ink, fontSize: 40, lineHeight: 48, fontWeight: '900', letterSpacing: -1.7 },
  heroTitleDesktop: { fontSize: 56, lineHeight: 64, letterSpacing: -2.4 },
  heroTitleWide: { fontSize: 54, lineHeight: 59, letterSpacing: -2.2 },
  heroBody: { color: Colors.muted, fontSize: 16, lineHeight: 26, maxWidth: 590, marginTop: 20 },
  search: { marginTop: 28, backgroundColor: Colors.paper, borderRadius: 16, padding: 7, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#16472C', shadowOpacity: 0.1, shadowRadius: 18, elevation: 2 },
  searchMobile: { flexWrap: 'wrap' },
  searchIcon: { fontSize: 23, color: Colors.muted },
  searchInput: { flex: 1, flexBasis: 180, minWidth: 0, color: Colors.ink, fontSize: 14, paddingVertical: 10, outlineStyle: 'none' } as any,
  searchButton: { backgroundColor: Colors.coral, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14 },
  searchButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 16 },
  trustText: { color: Colors.green, fontSize: 11, fontWeight: '600' },
  heroArt: { flex: 0.75, minHeight: 330, backgroundColor: '#CDEBD9', borderRadius: 140, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  sun: { position: 'absolute', width: 155, height: 155, borderRadius: 100, backgroundColor: Colors.yellowSoft, top: 40, right: 20, opacity: 0.95 },
  artHeart: { fontSize: 116, color: Colors.pink, opacity: 0.9, marginTop: -55 },
  artCard: { position: 'absolute', bottom: 35, left: 28, right: 28, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: 18 },
  quote: { color: Colors.ink, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  quoteAuthor: { color: Colors.muted, fontSize: 11, marginTop: 5 },
  peopleRow: { position: 'absolute', bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  people: { flexDirection: 'row', alignItems: 'center', paddingLeft: 3 },
  peopleDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#EAF7EF', marginLeft: -3 },
  peopleText: { color: Colors.muted, fontSize: 10 },
  heroVisualWide: { flex: 1.08, minWidth: 0, height: 430, borderRadius: 38, overflow: 'hidden', position: 'relative', backgroundColor: '#E7F4E8', borderWidth: 1, borderColor: '#D9ECDD', shadowColor: '#25613D', shadowOpacity: 0.08, shadowRadius: 24, elevation: 2 },
  heroVisualImage: { position: 'absolute', width: '100%', height: '100%' },
  storyPhoto: { position: 'absolute', width: 132, height: 92, padding: 5, borderRadius: 18, backgroundColor: '#FFF', shadowColor: '#17472C', shadowOpacity: 0.18, shadowRadius: 16, elevation: 4 },
  storyPhotoLeft: { left: 50, top: 24, transform: [{ rotate: '-4deg' }] },
  storyPhotoRight: { right: 42, top: 52, transform: [{ rotate: '5deg' }] },
  storyPhotoImage: { width: '100%', height: '100%', borderRadius: 13 },
  quoteCardWide: { position: 'absolute', left: '19%', right: '19%', bottom: 54, minHeight: 82, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 8, shadowColor: '#17472C', shadowOpacity: 0.1, shadowRadius: 14, elevation: 2 },
  quoteMark: { color: Colors.primary, fontSize: 28, lineHeight: 28, fontWeight: '900' },
  quoteCopyWide: { flex: 1, minWidth: 0 },
  quoteWide: { color: Colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  quoteAuthorWide: { color: Colors.muted, fontSize: 10, marginTop: 4 },
  communityRowWide: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  communityAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#F8FBF7', marginLeft: -8, backgroundColor: '#DDECE3' },
  communityAvatarFallback: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#F8FBF7', marginLeft: -8, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  communityAvatarHeart: { color: Colors.pink, fontSize: 10 },
  communityCount: { color: Colors.muted, fontSize: 10 },
  communityCountStrong: { color: Colors.primaryDark, fontWeight: '900' },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 42 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 48 },
  categoryPill: { paddingHorizontal: 17, paddingVertical: 10, borderRadius: 22, backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.line },
  categoryPillActive: { backgroundColor: Colors.coral, borderColor: Colors.coral },
  categoryText: { color: Colors.muted, fontSize: 12, fontWeight: '700' },
  categoryTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 23 },
  sectionHeaderCopy: { flex: 1, minWidth: 0, maxWidth: '100%' },
  sectionEyebrow: { color: Colors.coralDark, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 },
  sectionTitle: { color: Colors.ink, fontSize: 28, lineHeight: 35, fontWeight: '900', letterSpacing: -1 },
  viewAll: { color: Colors.coralDark, fontSize: 13, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  gridMobile: { flexDirection: 'column', flexWrap: 'nowrap' },
  outlineButton: { borderWidth: 1, borderColor: Colors.coral, borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 20 },
  outlineText: { color: Colors.coralDark, fontSize: 13, fontWeight: '800' },
  howSection: { marginTop: 70, backgroundColor: '#EAF7EF', borderRadius: 26, padding: 26, gap: 30, borderWidth: 1, borderColor: '#D6ECDE', overflow: 'hidden' },
  howDesktop: { flexDirection: 'row', alignItems: 'center', padding: 48, gap: 70 },
  howIntro: { flex: 0.8, minWidth: 0, width: '100%' },
  howTitle: { color: Colors.ink, fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -1 },
  howBody: { color: Colors.muted, fontSize: 14, lineHeight: 22, marginTop: 14 },
  steps: { width: '100%', flex: 1, minWidth: 0, gap: 19 },
  step: { width: '100%', minWidth: 0, flexDirection: 'row', gap: 15, alignItems: 'flex-start' },
  stepNumber: { flexShrink: 0, color: Colors.coral, fontSize: 23, fontWeight: '900', width: 42 },
  stepContent: { flex: 1, minWidth: 0 },
  stepTitle: { color: Colors.ink, fontSize: 15, fontWeight: '800' },
  stepText: { width: '100%', flexShrink: 1, color: Colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.line, paddingVertical: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footerHeart: { color: Colors.coral },
  footerText: { flexShrink: 1, color: Colors.muted, fontSize: 12, textAlign: 'center' },
  dataMessage: { color: Colors.muted, fontSize: 13, paddingVertical: 24 },
  dataError: { color: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 12, padding: 14, fontSize: 12 },
});
