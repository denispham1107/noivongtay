import type { CaseVideo } from '@/data/cases';

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

export function getYouTubeId(value: string) {
  const input = value.trim();
  if (YOUTUBE_ID.test(input)) return input;

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let candidate = '';

    if (host === 'youtu.be') candidate = url.pathname.split('/').filter(Boolean)[0] || '';
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      candidate = url.searchParams.get('v') || '';
      if (!candidate) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0])) candidate = parts[1] || '';
      }
    }

    return YOUTUBE_ID.test(candidate) ? candidate : '';
  } catch {
    return '';
  }
}

export function getYouTubeEmbedUrl(value: string) {
  const id = getYouTubeId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0` : '';
}

export function normalizeCaseVideo(value: unknown): CaseVideo | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CaseVideo>;
  if (candidate.source === 'youtube') {
    const youtubeId = getYouTubeId(candidate.youtubeId || candidate.url || '');
    if (!youtubeId) return null;
    return {
      source: 'youtube',
      youtubeId,
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      title: candidate.title?.trim() || '',
    };
  }
  if (candidate.source === 'upload' && typeof candidate.url === 'string' && candidate.url.trim()) {
    return {
      source: 'upload',
      url: candidate.url.trim(),
      storagePath: candidate.storagePath,
      title: candidate.title?.trim() || '',
    };
  }
  return null;
}
