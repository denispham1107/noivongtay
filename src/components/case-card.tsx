import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Shadows } from '@/constants/brand';
import { Text } from '@/components/fixed-text';
import type { CharityCase } from '@/data/cases';
import { getCaseImages, getCoverImage } from '@/data/cases';
import { defaultCasePriorities, priorityTextColor, type CasePriority } from '@/services/priorities';
import { formatMoney } from '@/utils/currency';

export function CaseCard({ item, priorityOption }: { item: CharityCase; priorityOption?: CasePriority }) {
  const displayPriority = priorityOption || defaultCasePriorities.find((entry) => entry.name === item.priority) || { id: 'fallback', name: item.priority, color: Colors.green, showFirst: false };
  const images = getCaseImages(item);
  const cover = getCoverImage(item);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={() => router.push(`/cases/${item.id}`)}>
      <View style={styles.imageWrap}>
        <Image source={cover?.url || item.image} style={styles.image} contentFit="cover" transition={300} alt={cover?.altText || `Hình ảnh của ${item.name}`} />
        <View style={[styles.badge, { backgroundColor: displayPriority.color }]}>
          <Text style={[styles.badgeText, { color: priorityTextColor(displayPriority.color) }]}>● {item.priority}</Text>
        </View>
        {images.length > 1 && <View style={styles.photoCount}><Text style={styles.photoCountText}>▣ {images.length} ảnh</Text></View>}
      </View>
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.location}>⌖ {item.location}</Text>
        </View>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.receivedRow}><Text style={styles.receivedLabel}>Đã nhận hỗ trợ</Text><Text style={styles.receivedValue}>{formatMoney(item.receivedAmount ?? 0)}</Text></View>
        <View style={styles.verifiedRow}>
          <Text style={styles.verified}>✓ Đã xác minh</Text>
          <Text style={styles.updated}>Cập nhật {item.updated.toLowerCase()}</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progress, { width: `${item.progress}%` }]} /></View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressText}>Đã đồng hành {item.progress}%</Text>
          <Text style={styles.supporters}>{item.supporters} người quan tâm</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.paper, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: Colors.line, minWidth: 270, flex: 1, ...Shadows.card },
  imageWrap: { height: 210, position: 'relative', backgroundColor: Colors.coralSoft },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', left: 14, top: 14, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  photoCount: { position: 'absolute', right: 14, top: 14, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(16,52,34,0.78)' },
  photoCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  content: { padding: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  category: { color: Colors.coralDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  location: { color: Colors.muted, fontSize: 12 },
  title: { color: Colors.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  summary: { color: Colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7, minHeight: 42 },
  receivedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primarySoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, marginTop: 12 },
  receivedLabel: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800' },
  receivedValue: { color: Colors.ink, fontSize: 13, fontWeight: '900' },
  verifiedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  verified: { color: Colors.green, fontSize: 11, fontWeight: '700' },
  updated: { color: '#819187', fontSize: 10 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#DDECE3', marginTop: 15, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: Colors.coral, borderRadius: 3 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { color: Colors.ink, fontSize: 11, fontWeight: '700' },
  supporters: { color: Colors.muted, fontSize: 10 },
});
