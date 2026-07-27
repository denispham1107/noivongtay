import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name || 'Nối Vòng Tay',
  slug: config.slug || 'noi-vong-tay',
  experiments: {
    ...config.experiments,
    // GitHub Pages hosts project sites below /<repository-name>.
    // This remains empty for localhost, iOS, and Android builds.
    baseUrl: process.env.EXPO_PUBLIC_SITE_BASE_URL || '',
  },
});
