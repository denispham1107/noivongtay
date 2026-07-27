import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/brand';
import { Text } from '@/components/fixed-text';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={[styles.mark, compact && styles.markCompact]}>
        <Text style={[styles.heart, compact && styles.heartCompact]}>♥︎</Text>
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.name, compact && styles.nameCompact]}>Nối Vòng Tay</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.tagline, compact && styles.taglineCompact]}>Chạm yêu thương · Gieo hy vọng</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  rowCompact: { gap: 6 },
  mark: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  markCompact: { width: 34, height: 34, borderRadius: 11 },
  heart: { color: '#E84C5B', fontSize: 21, transform: [{ rotate: '4deg' }] },
  heartCompact: { fontSize: 17 },
  copy: { flexShrink: 1, minWidth: 0 },
  copyCompact: { width: 96, maxWidth: 96 },
  name: { color: Colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  nameCompact: { fontSize: 14, letterSpacing: -0.25 },
  tagline: { color: Colors.muted, fontSize: 10, marginTop: 1 },
  taglineCompact: { fontSize: 7.5, marginTop: 0 },
});
