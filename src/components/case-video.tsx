import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { CaseVideo } from '@/data/cases';
import {
  getYouTubeEmbedUrl,
  YOUTUBE_EMBED_REFERRER,
} from '@/utils/case-video';

function buildYouTubeDocument(embedUrl: string) {
  const safeUrl = embedUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <style>
      html, body { width: 100%; height: 100%; margin: 0; background: #102f22; overflow: hidden; }
      iframe { display: block; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${safeUrl}"
      title="Video hoàn cảnh trên YouTube"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  </body>
</html>`;
}

export function CaseVideoPlayer({ video }: { video: CaseVideo }) {
  const player = useVideoPlayer(video.source === 'upload' ? video.url : null);

  if (video.source === 'youtube') {
    const embedUrl = getYouTubeEmbedUrl(video.youtubeId || video.url);
    if (!embedUrl) return null;
    return (
      <View style={styles.frame}>
        <WebView
          source={{
            html: buildYouTubeDocument(embedUrl),
            baseUrl: YOUTUBE_EMBED_REFERRER,
          }}
          style={styles.player}
          originWhitelist={['https://*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          setSupportMultipleWindows={false}
        />
      </View>
    );
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
