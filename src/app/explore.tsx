import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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

const filterAccents = [
  { backgroundColor: Colors.primaryMist, borderColor: Colors.line },
  { backgroundColor: Colors.orangeSoft, borderColor: '#F8CBAE' },
  { backgroundColor: Colors.purpleSoft, borderColor: '#DCCCF2' },
  { backgroundColor: Colors.yellowSoft, borderColor: '#F0DF9B' },
  { backgroundColor: Colors.pinkSoft, borderColor: '#F2C5D8' },
];

export default function ExploreScreen() {
  const { category: categoryParam } = useLocalSearchParams<{ category?: string | string[] }>();
  const { width } = useWindowDimensions();
  const { cases, loading, error } = usePublishedCases();
  const { categories: categoryOptions } = useCaseCategories();
  const { priorities } = useCasePriorities();
  const categories = ['Tất cả', ...categoryOptions.map((item) => item.name)];
  const [selected, setSelected] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => sortCasesByPriority(cases.filter((item) => (selected === 'Tất cả' || item.category === selected) && `${item.name} ${item.location} ${item.summary}`.toLowerCase().includes(query.toLowerCase())), priorities), [cases, priorities, selected, query]);

  useEffect(() => {
    const requestedCategory = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
    if (requestedCategory && categories.includes(requestedCategory)) {
      setSelected(requestedCategory);
    }
  }, [categoryParam, categories.join('|')]);

  useEffect(() => {
    if (!categories.includes(selected)) setSelected('Tất cả');
  }, [categories.join('|'), selected]);

  return <SafeAreaView style={styles.safe} edges={['top']}><PublicHeader /><KeyboardAwareScrollView contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>KHÁM PHÁ NHỮNG CÂU CHUYỆN</Text>
    <Text style={styles.title}>Mỗi sự quan tâm đều có ý nghĩa.</Text>
    <Text style={styles.subtitle}>Tìm một hoàn cảnh bạn muốn lắng nghe và cùng lan tỏa điều tử tế.</Text>
    <View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên, khu vực..." placeholderTextColor="#9A8D86" style={styles.input} /></View>
    <View style={styles.filters}>{categories.map((item, index) => <Pressable key={item} onPress={() => setSelected(item)} style={[styles.pill, index === 0 ? filterAccents[0] : filterAccents[((index - 1) % (filterAccents.length - 1)) + 1], selected === item && styles.pillActive]}><Text style={[styles.pillText, selected === item && styles.pillTextActive]}>{item}</Text></Pressable>)}</View>
    <Text style={styles.count}>{loading ? 'Đang tải dữ liệu…' : `${filtered.length} hoàn cảnh đã được xác minh`}</Text>
    {!!error && <Text style={styles.error}>Không thể tải dữ liệu: {error}</Text>}
    {!loading && !error && filtered.length === 0 ? <Text style={styles.empty}>Không tìm thấy hoàn cảnh phù hợp.</Text> : <View style={styles.grid}>{filtered.map((item) => <View key={item.id} style={{ width: width >= 1000 ? '31.8%' : width >= 620 ? '48%' : '100%' }}><CaseCard item={item} priorityOption={priorities.find((entry) => entry.name === item.priority)} /></View>)}</View>}
  </KeyboardAwareScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream }, page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 80 },
  eyebrow: { color: Colors.coralDark, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textAlign: 'center' }, title: { color: Colors.ink, fontSize: 38, fontWeight: '900', letterSpacing: -1.6, textAlign: 'center', marginTop: 10 }, subtitle: { color: Colors.muted, fontSize: 15, textAlign: 'center', marginTop: 11 },
  search: { maxWidth: 620, width: '100%', alignSelf: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: 28 }, searchIcon: { fontSize: 22, color: Colors.muted }, input: { flex: 1, fontSize: 14, paddingVertical: 15, color: Colors.ink, outlineStyle: 'none' } as any,
  filters: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 9, marginTop: 25 }, pill: { paddingVertical: 9, paddingHorizontal: 17, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.line }, pillActive: { backgroundColor: Colors.coral, borderColor: Colors.coral }, pillText: { color: Colors.muted, fontWeight: '700', fontSize: 12 }, pillTextActive: { color: '#fff' }, count: { color: Colors.muted, fontSize: 12, marginTop: 44, marginBottom: 18 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  error: { color: Colors.red, backgroundColor: Colors.redSoft, borderRadius: 12, padding: 14, marginBottom: 18 }, empty: { color: Colors.muted, paddingVertical: 30, textAlign: 'center' },
});
