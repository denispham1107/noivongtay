import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { CaseVideo } from '@/data/cases';
import { getYouTubeEmbedUrl } from '@/utils/case-video';

export function CaseVideoPlayer({ video }: { video: CaseVideo }) {
  const player = useVideoPlayer(video.source === 'upload' ? video.url : null);

  if (video.source === 'youtube') {
    const embedUrl = getYouTubeEmbedUrl(video.youtubeId || video.url);
    if (!embedUrl) return null;
    return <View style={styles.frame}><WebView source={{ uri: embedUrl }} style={styles.player} allowsFullscreenVideo mediaPlaybackRequiresUserAction /></View>;
  }

  return <View style={styles.frame}><VideoView player={player} style={styles.player} nativeControls contentFit="contain" allowsFullscreen /></View>;
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#102F22',
  },
  player: { flex: 1, width: '100%', height: '100%' },
});
