import React from 'react';
import { View } from 'react-native';

import type { CaseVideo } from '@/data/cases';
import { getYouTubeEmbedUrl } from '@/utils/case-video';

const frameStyle = {
  width: '100%',
  height: '100%',
  border: 0,
  display: 'block',
  backgroundColor: '#102F22',
};

export function CaseVideoPlayer({ video }: { video: CaseVideo }) {
  const media = video.source === 'youtube'
    ? React.createElement('iframe', {
        src: getYouTubeEmbedUrl(video.youtubeId || video.url),
        title: video.title || 'Video hoàn cảnh',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowFullScreen: true,
        style: frameStyle,
      })
    : React.createElement('video', {
        src: video.url,
        title: video.title || 'Video hoàn cảnh',
        controls: true,
        playsInline: true,
        preload: 'metadata',
        style: frameStyle,
      });

  return <View style={{ width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: 16, backgroundColor: '#102F22' }}>{media}</View>;
}
