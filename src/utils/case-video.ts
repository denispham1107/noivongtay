import type { CaseVideo } from '@/data/cases';

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
export const YOUTUBE_EMBED_ORIGIN = 'https://denispham1107.github.io';
export const YOUTUBE_EMBED_REFERRER = `${YOUTUBE_EMBED_ORIGIN}/noivongtay/`;

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
  if (!id) return '';

  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    origin: YOUTUBE_EMBED_ORIGIN,
    widget_referrer: YOUTUBE_EMBED_REFERRER,
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function normalizeCaseVideo(value: unknown, includeDisabled = false): CaseVideo | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CaseVideo>;
  const enabled = candidate.enabled !== false;
  if (!enabled && !includeDisabled) return null;
  if (candidate.source === 'youtube') {
    const youtubeId = getYouTubeId(candidate.youtubeId || candidate.url || '');
    if (!youtubeId) return null;
    return {
      source: 'youtube',
      youtubeId,
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      enabled,
      title: candidate.title?.trim() || '',
    };
  }
  if (candidate.source === 'upload' && typeof candidate.url === 'string' && candidate.url.trim()) {
    return {
      source: 'upload',
      url: candidate.url.trim(),
      enabled,
      storagePath: candidate.storagePath,
      title: candidate.title?.trim() || '',
    };
  }
  return null;
}
