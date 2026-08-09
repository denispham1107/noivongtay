import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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

function ShieldCheckIcon() {
  return (
    <View style={styles.shieldIconMobile} accessibilityElementsHidden>
      <Text style={styles.shieldCheckMobile}>✓</Text>
    </View>
  );
}

function LockIcon() {
  return (
    <View style={styles.lockIconMobile} accessibilityElementsHidden>
      <View style={styles.lockShackleMobile} />
      <View style={styles.lockBodyMobile}><View style={styles.lockKeyholeMobile} /></View>
    </View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const webUsesTouch = Platform.OS === 'web'
    && typeof navigator !== 'undefined'
    && (navigator.maxTouchPoints > 0
      || (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches));
  const webTabletLandscape = webUsesTouch && width >= 760 && width <= 1400 && width >= height;
  const desktop = width >= 760;
  const wideDesktop = Platform.OS === 'web' && width >= 1100 && !webTabletLandscape;
  const tabletPortrait = width >= 600 && width < 1100 && height > width;
  const tabletLandscape = width >= 760 && width >= height && (Platform.OS !== 'web' || width < 1100 || webTabletLandscape);
  const tabletLayout = tabletPortrait || tabletLandscape;
  const phoneLayout = !desktop && !tabletPortrait;
  const featureWideLayout = wideDesktop || tabletLayout;
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

  const openCategory = (category: string) => {
    router.push({ pathname: '/explore', params: { category } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PublicHeader />
      <KeyboardAwareScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroOuter, phoneLayout && styles.heroOuterMobile, featureWideLayout && styles.heroOuterWide]}>
          {phoneLayout && (
            <Image
              source={require('../../assets/images/hero-mobile-botanical-v2.png')}
              style={styles.heroBackdropMobile}
              contentFit="cover"
              contentPosition="center"
              transition={250}
              alt="Nền lá cây và những đường nét hình trái tim"
            />
          )}
          {featureWideLayout && (
            <Image
              source={require('../../assets/images/hero-community-seamless-desktop.png')}
              style={styles.heroBackdropWide}
              contentFit="fill"
              transition={250}
              alt="Cành lá và những bàn tay cùng nâng chiếc lá hình trái tim"
            />
          )}
          <View style={[styles.hero, phoneLayout && styles.heroMobile, desktop && styles.heroDesktop, featureWideLayout && styles.heroDesktopWide, tabletPortrait && styles.heroTablet, tabletLandscape && styles.heroTabletLandscape]}>
            <View style={[styles.heroCopy, phoneLayout && styles.heroCopyMobile, featureWideLayout && styles.heroCopyWide, tabletPortrait && styles.heroCopyTablet, tabletLandscape && styles.heroCopyTabletLandscape]}>
              <View style={[styles.eyebrow, phoneLayout && styles.eyebrowMobile, tabletLayout && styles.eyebrowTablet]}><Text style={[styles.eyebrowText, phoneLayout && styles.eyebrowTextMobile, tabletLayout && styles.eyebrowTextTablet]}>♥  CÙNG NHAU TẠO NÊN THAY ĐỔI</Text></View>
              <Text style={[styles.heroTitle, phoneLayout && styles.heroTitleMobile, desktop && styles.heroTitleDesktop, featureWideLayout && styles.heroTitleWide, tabletPortrait && styles.heroTitleTablet, tabletLandscape && styles.heroTitleTabletLandscape]}>Một vòng tay mở ra,{`\n`}một hy vọng bắt đầu.</Text>
              <Text style={[styles.heroBody, phoneLayout && styles.heroBodyMobile, tabletPortrait && styles.heroBodyTablet, tabletLandscape && styles.heroBodyTabletLandscape]}>Kết nối những hoàn cảnh đang cần giúp đỡ với những tấm lòng sẵn sàng sẻ chia — minh bạch, tử tế và đầy yêu thương.</Text>
              <View style={[styles.search, phoneLayout && styles.searchMobile, tabletLayout && styles.searchTablet, tabletLandscape && styles.searchTabletLandscape]}>
                <View style={phoneLayout ? styles.searchIconCircleMobile : undefined}><Text style={[styles.searchIcon, phoneLayout && styles.searchIconMobile]}>⌕</Text></View>
                <TextInput placeholder="Tìm theo tên, khu vực hoặc câu chuyện..." placeholderTextColor="#8C978F" style={[styles.searchInput, phoneLayout && styles.searchInputMobile, tabletLayout && styles.searchInputTablet, tabletLandscape && styles.searchInputTabletLandscape]} accessibilityLabel="Tìm kiếm hoàn cảnh" />
                <Pressable style={[styles.searchButton, phoneLayout && styles.searchButtonMobile, tabletLayout && styles.searchButtonTablet, tabletLandscape && styles.searchButtonTabletLandscape]} onPress={() => router.push('/explore')}><Text style={[styles.searchButtonText, phoneLayout && styles.searchButtonTextMobile]}>Tìm kiếm</Text></Pressable>
              </View>
              {phoneLayout ? (
                <View style={[styles.trustRow, styles.trustRowMobile]}>
                  <View style={styles.trustItemMobile}><ShieldCheckIcon /><Text style={[styles.trustText, styles.trustTextMobile]}>Thông tin được xác minh</Text></View>
                  <View style={styles.trustDividerMobile} />
                  <View style={styles.trustItemMobile}><LockIcon /><Text style={[styles.trustText, styles.trustTextMobile]}>Tôn trọng và bảo mật</Text></View>
                </View>
              ) : (
                <View style={styles.trustRow}>
                  <Text style={styles.trustText}>✓ Thông tin được xác minh</Text>
                  <Text style={styles.trustText}>♡ Tôn trọng và bảo mật</Text>
                </View>
              )}
            </View>
            {featureWideLayout ? (
              <View style={[styles.heroVisualWide, tabletPortrait && styles.heroVisualTablet, tabletLandscape && styles.heroVisualTabletLandscape]}>
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
                <View style={[styles.quoteCardWide, tabletPortrait && styles.quoteCardTablet, tabletLandscape && styles.quoteCardTabletLandscape]}>
                  <Text style={styles.quoteMark}>“</Text>
                  <View style={styles.quoteCopyWide}>
                    <Text style={styles.quoteWide}>“Sự tử tế, dù nhỏ bé, cũng chưa bao giờ là lãng phí.”</Text>
                    <Text style={styles.quoteAuthorWide}>— Aesop</Text>
                  </View>
                </View>
                <View style={[styles.communityRowWide, tabletPortrait && styles.communityRowTablet, tabletLandscape && styles.communityRowTabletLandscape]}>
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
              <Pressable key={category} accessibilityRole="button" accessibilityLabel={`Khám phá danh mục ${category}`} style={[styles.categoryPill, index === 0 ? styles.categoryPillActive : accentPills[(index - 1) % accentPills.length]]} onPress={() => openCategory(category)}>
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

          <View style={[styles.howSection, phoneLayout && styles.howSectionMobile, desktop && styles.howDesktop, featureWideLayout && styles.howDesktopWide, tabletPortrait && styles.howTablet, tabletLandscape && styles.howTabletLandscape]}>
            {phoneLayout && (
              <Image
                source={require('../../assets/images/footer-mobile-botanical-v2.png')}
                style={styles.howBackdropMobile}
                contentFit="fill"
                contentPosition="center"
                transition={250}
                alt="Nền cành lá và đường nét trái tim"
              />
            )}
            {featureWideLayout && (
              <Image
                source={require('../../assets/images/footer-process-desktop.png')}
                style={styles.howBackdropWide}
                contentFit="fill"
                contentPosition="center"
                transition={250}
                alt="Cành lá và đôi bàn tay nâng trái tim"
              />
            )}
            <View style={[styles.howIntro, phoneLayout && styles.howIntroMobile, featureWideLayout && styles.howIntroWide, tabletPortrait && styles.howIntroTablet, tabletLandscape && styles.howIntroTabletLandscape]}>
              <View style={styles.howEyebrowRow}>
                {featureWideLayout && <View style={styles.howShield}><DesktopProcessIcon type="shield" color={Colors.primary} /></View>}
                <Text style={styles.sectionEyebrow}>MINH BẠCH TRONG TỪNG KẾT NỐI</Text>
              </View>
              <Text style={[styles.howTitle, phoneLayout && styles.howTitleMobile, tabletLayout && styles.howTitleTablet, tabletLandscape && styles.howTitleTabletLandscape]}>Mỗi câu chuyện đều được nâng niu và xác minh.</Text>
              {phoneLayout && <View style={styles.howAccentMobile} />}
              <Text style={[styles.howBody, phoneLayout && styles.howBodyMobile, tabletLayout && styles.howBodyTablet, tabletLandscape && styles.howBodyTabletLandscape]}>Chúng tôi đặt sự tôn trọng, minh bạch và an toàn của người cần hỗ trợ lên hàng đầu.</Text>
            </View>
            <View style={[styles.steps, phoneLayout && styles.stepsMobile, featureWideLayout && styles.stepsWide, tabletPortrait && styles.stepsTablet, tabletLandscape && styles.stepsTabletLandscape]}>
              {phoneLayout && <View style={styles.stepConnectorMobile} />}
              {featureWideLayout && <View style={styles.stepConnectorWide} />}
              <Step number="01" icon="document" title="Tiếp nhận" text="Thông tin được tiếp nhận từ cộng đồng và đối tác địa phương." decorated={featureWideLayout} mobileDecorated={phoneLayout} />
              <Step number="02" icon="shield" title="Xác minh" text="Đội ngũ kiểm tra, liên hệ và bảo vệ dữ liệu nhạy cảm." decorated={featureWideLayout} mobileDecorated={phoneLayout} />
              <Step number="03" icon="people" title="Kết nối" text="Câu chuyện được chia sẻ rõ ràng đến những tấm lòng đồng hành." decorated={featureWideLayout} mobileDecorated={phoneLayout} />
            </View>
          </View>
        </View>

        <View style={[styles.footer, !desktop && styles.footerMobile]}><Text style={!desktop ? styles.footerLeafMobile : styles.footerHeart}>{!desktop ? '⌁' : '♥'}</Text><Text style={styles.footerHeart}>♥</Text><Text style={[styles.footerText, !desktop && styles.footerTextMobile]}>Nối Vòng Tay · Cùng gieo những điều tử tế</Text>{!desktop && <Text style={[styles.footerLeafMobile, styles.footerLeafRightMobile]}>⌁</Text>}</View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

type ProcessIconType = 'document' | 'shield' | 'people';

function MobileProcessIcon({ type }: { type: ProcessIconType }) {
  const common = { fill: 'none', stroke: '#16834A', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  if (type === 'document') {
    return <Svg width="43" height="43" viewBox="0 0 24 24"><Rect x="5" y="4" width="13" height="17" rx="2" {...common} /><Path d="M9 4V2.8h5V4M8 9h7M8 12h5M8 15h3" {...common} /><Path d="M18.4 13.7c-1.8-2.1-5.2-.7-4.4 2 .5 1.7 2.8 3.4 4.4 4.6 1.6-1.2 3.9-2.9 4.4-4.6.8-2.7-2.6-4.1-4.4-2Z" fill="#fff" stroke="#16834A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  }
  if (type === 'shield') {
    return <Svg width="43" height="43" viewBox="0 0 24 24"><Path d="M12 2.5 20 6v5.7c0 5.2-2.9 8.6-8 11.3-5.1-2.7-8-6.1-8-11.3V6l8-3.5Z" {...common} /><Path d="m8.5 12 2.4 2.4 5-5.4" {...common} /></Svg>;
  }
  return <Svg width="43" height="43" viewBox="0 0 24 24"><Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" {...common} /></Svg>;
}

function DesktopProcessIcon({ type, color = '#FFFFFF' }: { type: ProcessIconType; color?: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24" accessibilityElementsHidden>
      {type === 'document' ? (
        <>
          <Rect x={6.5} y={3} width={11} height={18} rx={1.7} {...common} />
          <Path d="M9 3h6v3H9z" {...common} />
          <Path d="M9 10h6M9 14h6M9 18h4.5" {...common} />
        </>
      ) : type === 'shield' ? (
        <>
          <Path d="M12 2.8 19 5.7v5.2c0 4.5-2.6 7.5-7 9.8-4.4-2.3-7-5.3-7-9.8V5.7L12 2.8Z" {...common} />
          <Path d="m8.7 11.8 2.1 2.1 4.5-4.7" {...common} />
        </>
      ) : (
        <>
          <Circle cx={12} cy={7.2} r={2.3} {...common} />
          <Circle cx={6.8} cy={9} r={1.7} {...common} />
          <Circle cx={17.2} cy={9} r={1.7} {...common} />
          <Path d="M7.9 19v-2.2c0-2.5 1.7-4.1 4.1-4.1s4.1 1.6 4.1 4.1V19" {...common} />
          <Path d="M3.8 18v-1.6c0-2 1.2-3.2 3-3.2.8 0 1.4.2 2 .6M20.2 18v-1.6c0-2-1.2-3.2-3-3.2-.8 0-1.4.2-2 .6" {...common} />
        </>
      )}
    </Svg>
  );
}

function Step({ number, title, text, icon, decorated = false, mobileDecorated = false }: { number: string; title: string; text: string; icon?: ProcessIconType; decorated?: boolean; mobileDecorated?: boolean }) {
  return <View style={[styles.step, decorated && styles.stepWide, mobileDecorated && styles.stepMobile]}>{decorated && icon && <View style={styles.stepIconWide}><View style={styles.stepIconDrawingWide}><DesktopProcessIcon type={icon} /></View></View>}{mobileDecorated && icon && <View style={styles.stepIconMobile}><MobileProcessIcon type={icon} /></View>}{!mobileDecorated && <Text style={[styles.stepNumber, decorated && styles.stepNumberWide]}>{number}</Text>}<View style={[styles.stepContent, mobileDecorated && styles.stepContentMobile]}><Text style={[styles.stepTitle, mobileDecorated && styles.stepTitleMobile]}>{title}</Text><Text style={[styles.stepText, mobileDecorated && styles.stepTextMobile]}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  page: { flexGrow: 1 },
  heroOuter: { backgroundColor: '#EAF7EF', borderBottomWidth: 1, borderBottomColor: '#D6ECDE' },
  heroOuterMobile: { position: 'relative', overflow: 'hidden', backgroundColor: '#F4FBF6' },
  heroBackdropMobile: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  heroOuterWide: { backgroundColor: '#FAFCF8', position: 'relative', overflow: 'hidden' },
  heroBackdropWide: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  hero: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 55 },
  heroMobile: { minHeight: 430, paddingHorizontal: 19, paddingTop: 34, paddingBottom: 18, position: 'relative' },
  heroDesktop: { flexDirection: 'row', minHeight: 500, alignItems: 'center', gap: 70, paddingVertical: 70 },
  heroDesktopWide: { maxWidth: 1440, minHeight: 520, gap: 36, paddingHorizontal: 32, paddingVertical: 44, position: 'relative' },
  heroTablet: { flexDirection: 'row', minHeight: 330, alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 26 },
  heroTabletLandscape: { minHeight: 350, gap: 18, paddingHorizontal: 28, paddingVertical: 24 },
  heroCopy: { flex: 1, width: '100%', maxWidth: 650, minWidth: 0 },
  heroCopyMobile: { zIndex: 1, maxWidth: 520 },
  heroCopyWide: { flex: 0.92, maxWidth: 620, paddingLeft: 8 },
  heroCopyTablet: { flex: 0.94, maxWidth: '48%', paddingLeft: 0 },
  heroCopyTabletLandscape: { flex: 0.9, maxWidth: '46%', paddingLeft: 0 },
  eyebrow: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, marginBottom: 18 },
  eyebrowMobile: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 13, paddingVertical: 8, marginBottom: 24, shadowColor: '#17472C', shadowOpacity: 0.08, shadowRadius: 12, elevation: 1 },
  eyebrowText: { color: Colors.coralDark, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  eyebrowTextMobile: { color: Colors.primaryDark, fontSize: 10, letterSpacing: 1.05 },
  eyebrowTablet: { paddingHorizontal: 9, paddingVertical: 6, marginBottom: 12 },
  eyebrowTextTablet: { color: Colors.primaryDark, fontSize: 8, letterSpacing: 0.75 },
  heroTitle: { color: Colors.ink, fontSize: 40, lineHeight: 48, fontWeight: '900', letterSpacing: -1.7 },
  heroTitleMobile: { fontSize: 37, lineHeight: 43, letterSpacing: -1.6, maxWidth: 480 },
  heroTitleDesktop: { fontSize: 56, lineHeight: 64, letterSpacing: -2.4 },
  heroTitleWide: { fontSize: 54, lineHeight: 59, letterSpacing: -2.2 },
  heroTitleTablet: { fontSize: 30, lineHeight: 34, letterSpacing: -1.1 },
  heroTitleTabletLandscape: { fontSize: 36, lineHeight: 40, letterSpacing: -1.45 },
  heroBody: { color: Colors.muted, fontSize: 16, lineHeight: 26, maxWidth: 590, marginTop: 20 },
  heroBodyMobile: { color: '#64756B', fontSize: 15, lineHeight: 22, maxWidth: 455, marginTop: 18 },
  heroBodyTablet: { fontSize: 11, lineHeight: 17, marginTop: 12, maxWidth: 350 },
  heroBodyTabletLandscape: { fontSize: 12, lineHeight: 18, marginTop: 14, maxWidth: 410 },
  search: { marginTop: 28, backgroundColor: Colors.paper, borderRadius: 16, padding: 7, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#16472C', shadowOpacity: 0.1, shadowRadius: 18, elevation: 2 },
  searchMobile: { marginTop: 35, flexWrap: 'nowrap', borderRadius: 17, padding: 7, paddingLeft: 9, gap: 7, shadowOpacity: 0.12, shadowRadius: 16 },
  searchTablet: { marginTop: 17, borderRadius: 12, padding: 5, paddingLeft: 10, gap: 6 },
  searchTabletLandscape: { marginTop: 19, borderRadius: 13, padding: 5, paddingLeft: 11 },
  searchIcon: { fontSize: 23, color: Colors.muted },
  searchIconCircleMobile: { flexShrink: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F8EF' },
  searchIconMobile: { color: Colors.primaryDark, fontSize: 22, lineHeight: 24 },
  searchInput: { flex: 1, flexBasis: 180, minWidth: 0, color: Colors.ink, fontSize: 14, paddingVertical: 10, outlineStyle: 'none' } as any,
  searchInputMobile: { flexBasis: 0, fontSize: 14, paddingVertical: 9 },
  searchInputTablet: { flexBasis: 0, fontSize: 10, paddingVertical: 5 },
  searchInputTabletLandscape: { fontSize: 11, paddingVertical: 6 },
  searchButton: { backgroundColor: Colors.coral, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14 },
  searchButtonMobile: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#16472C', shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
  searchButtonTablet: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10 },
  searchButtonTabletLandscape: { paddingHorizontal: 18, paddingVertical: 11 },
  searchButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  searchButtonTextMobile: { fontSize: 13 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 16 },
  trustRowMobile: { width: '100%', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 14, paddingHorizontal: 7 },
  trustItemMobile: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustDividerMobile: { width: 1, height: 20, backgroundColor: '#CFE4D6' },
  shieldIconMobile: { width: 16, height: 18, borderWidth: 1.8, borderColor: Colors.primary, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: 'center', justifyContent: 'center' },
  shieldCheckMobile: { color: Colors.primary, fontSize: 10, lineHeight: 11, fontWeight: '900' },
  lockIconMobile: { width: 17, height: 18, alignItems: 'center', justifyContent: 'flex-end' },
  lockShackleMobile: { position: 'absolute', top: 0, width: 10, height: 10, borderWidth: 1.8, borderColor: Colors.primary, borderBottomWidth: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  lockBodyMobile: { width: 16, height: 11, borderWidth: 1.8, borderColor: Colors.primary, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.3)' },
  lockKeyholeMobile: { width: 2.5, height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  trustText: { color: Colors.green, fontSize: 11, fontWeight: '600' },
  trustTextMobile: { flexShrink: 1, color: Colors.primaryDark, fontSize: 10, lineHeight: 14, fontWeight: '700' },
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
  heroVisualWide: { flex: 1.08, minWidth: 0, height: 430, position: 'relative', overflow: 'visible' },
  heroVisualTablet: { flex: 1.06, height: 278, overflow: 'hidden' },
  heroVisualTabletLandscape: { flex: 1.1, height: 310, overflow: 'hidden' },
  storyPhoto: { position: 'absolute', width: 142, height: 96, padding: 5, borderRadius: 18, backgroundColor: '#FFF', shadowColor: '#17472C', shadowOpacity: 0.18, shadowRadius: 16, elevation: 4 },
  storyPhotoLeft: { left: 46, top: 18, transform: [{ rotate: '-4deg' }] },
  storyPhotoRight: { right: 28, top: 64, transform: [{ rotate: '5deg' }] },
  storyPhotoImage: { width: '100%', height: '100%', borderRadius: 13 },
  quoteCardWide: { position: 'absolute', left: '19%', right: '19%', bottom: 54, minHeight: 82, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 8, shadowColor: '#17472C', shadowOpacity: 0.1, shadowRadius: 14, elevation: 2 },
  quoteCardTablet: { left: '9%', right: '9%', bottom: 40, minHeight: 62, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 10, gap: 5 },
  quoteCardTabletLandscape: { left: '11%', right: '11%', bottom: 42, minHeight: 66, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, gap: 6 },
  quoteMark: { color: Colors.primary, fontSize: 28, lineHeight: 28, fontWeight: '900' },
  quoteCopyWide: { flex: 1, minWidth: 0 },
  quoteWide: { color: Colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  quoteAuthorWide: { color: Colors.muted, fontSize: 10, marginTop: 4 },
  communityRowWide: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  communityRowTablet: { bottom: 8, gap: 6 },
  communityRowTabletLandscape: { bottom: 9, gap: 7 },
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
  howSectionMobile: { minHeight: 735, marginTop: 58, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 35, gap: 30, borderRadius: 28, position: 'relative', backgroundColor: '#FBFDF9', borderColor: '#DDEBE2', shadowColor: '#17472C', shadowOpacity: 0.08, shadowRadius: 18, elevation: 2 },
  howBackdropMobile: { ...StyleSheet.absoluteFillObject },
  howDesktop: { flexDirection: 'row', alignItems: 'center', padding: 48, gap: 70 },
  howDesktopWide: { minHeight: 300, paddingLeft: 74, paddingRight: 155, paddingVertical: 42, gap: 56, position: 'relative', backgroundColor: '#F8FBF7', borderColor: '#DDEEE3' },
  howTablet: { flexDirection: 'row', minHeight: 245, paddingHorizontal: 25, paddingVertical: 24, gap: 22, alignItems: 'center', position: 'relative', backgroundColor: '#F8FBF7', borderColor: '#DDEEE3' },
  howTabletLandscape: { minHeight: 270, paddingLeft: 42, paddingRight: 72, paddingVertical: 31, gap: 34, alignItems: 'center' },
  howBackdropWide: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  howIntro: { flex: 0.8, minWidth: 0, width: '100%' },
  howIntroMobile: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', position: 'relative', zIndex: 1 },
  howIntroWide: { maxWidth: 370, position: 'relative' },
  howIntroTablet: { flex: 0.8, maxWidth: '39%' },
  howIntroTabletLandscape: { flex: 0.86, maxWidth: '40%' },
  howEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  howShield: { width: 25, height: 25 },
  howTitle: { color: Colors.ink, fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -1 },
  howTitleMobile: { maxWidth: 320, fontSize: 38, lineHeight: 46, letterSpacing: -1.5 },
  howTitleTablet: { fontSize: 22, lineHeight: 27, letterSpacing: -0.8 },
  howTitleTabletLandscape: { fontSize: 27, lineHeight: 32, letterSpacing: -1 },
  howAccentMobile: { width: 42, height: 3, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 18 },
  howBody: { color: Colors.muted, fontSize: 14, lineHeight: 22, marginTop: 14 },
  howBodyMobile: { maxWidth: 310, fontSize: 15, lineHeight: 23, marginTop: 18 },
  howBodyTablet: { fontSize: 10, lineHeight: 15, marginTop: 9 },
  howBodyTabletLandscape: { fontSize: 11, lineHeight: 17, marginTop: 11, maxWidth: 370 },
  steps: { width: '100%', flex: 1, minWidth: 0, gap: 19 },
  stepsMobile: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', gap: 25, position: 'relative', zIndex: 1, paddingTop: 2, width: '100%' },
  stepConnectorMobile: { position: 'absolute', left: 28, top: 48, bottom: 48, width: 1.5, borderRadius: 2, backgroundColor: '#CDE4D4' },
  stepsWide: { maxWidth: 520, gap: 14, position: 'relative' },
  stepsTablet: { flex: 1.2, maxWidth: '57%', gap: 10 },
  stepsTabletLandscape: { flex: 1.18, maxWidth: '55%', gap: 12 },
  stepConnectorWide: { position: 'absolute', left: 22, top: 35, bottom: 35, width: 2, backgroundColor: '#B8DBC6' },
  step: { width: '100%', minWidth: 0, flexDirection: 'row', gap: 15, alignItems: 'flex-start' },
  stepMobile: { minHeight: 83, alignItems: 'flex-start', gap: 16, position: 'relative', width: '100%', paddingRight: 2 },
  stepWide: { minHeight: 58, alignItems: 'center', gap: 13, position: 'relative' },
  stepIconMobile: { flexShrink: 0, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.96)', shadowColor: '#17472C', shadowOpacity: 0.11, shadowRadius: 13, elevation: 3, zIndex: 1 },
  stepIconDrawingMobile: { width: 43, height: 43 },
  stepIconWide: { flexShrink: 0, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryDark, borderWidth: 3, borderColor: '#E7F4EB' },
  stepIconDrawingWide: { width: 25, height: 25 },
  stepNumber: { flexShrink: 0, color: Colors.coral, fontSize: 23, fontWeight: '900', width: 42 },
  stepNumberWide: { color: Colors.primary, fontSize: 19, width: 34 },
  stepContent: { flex: 1, minWidth: 0 },
  stepContentMobile: { flexShrink: 1, width: 0, paddingTop: 2 },
  stepTitle: { color: Colors.ink, fontSize: 15, fontWeight: '800' },
  stepTitleMobile: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  stepText: { width: '100%', flexShrink: 1, color: Colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  stepTextMobile: { fontSize: 14, lineHeight: 21, marginTop: 7 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.line, paddingVertical: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footerMobile: { minHeight: 86, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 27, borderTopWidth: 0, gap: 7 },
  footerHeart: { color: Colors.coral },
  footerText: { flexShrink: 1, color: Colors.muted, fontSize: 12, textAlign: 'center' },
  footerTextMobile: { fontSize: 13, lineHeight: 18 },
  footerLeafMobile: { color: '#B7DCC3', fontSize: 25, lineHeight: 26, transform: [{ rotate: '24deg' }] },
  footerLeafRightMobile: { transform: [{ rotate: '204deg' }] },
  dataMessage: { color: Colors.muted, fontSize: 13, paddingVertical: 24 },
  dataError: { color: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 12, padding: 14, fontSize: 12 },
});
