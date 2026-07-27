import { Image, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/brand';

export function BrandedLoader() {
  return (
    <View accessibilityLabel="Đang mở Nối Vòng Tay" style={styles.screen}>
      <Image source={require('../../assets/images/splash-icon.png')} resizeMode="contain" style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMist,
  },
  icon: {
    width: 128,
    height: 128,
  },
});
