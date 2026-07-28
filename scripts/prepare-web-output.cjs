const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDirectory = path.join(projectRoot, 'dist');
const sourceIconsDirectory = path.join(projectRoot, 'assets', 'images');
const rawBaseUrl = (process.env.EXPO_PUBLIC_SITE_BASE_URL || '').trim();
const baseUrl = rawBaseUrl && rawBaseUrl !== '/'
  ? `/${rawBaseUrl.replace(/^\/+|\/+$/g, '')}`
  : '';

function sitePath(relativePath) {
  return `${baseUrl}/${relativePath.replace(/^\/+/, '')}`;
}

function copyIcon(fileName) {
  fs.copyFileSync(
    path.join(sourceIconsDirectory, fileName),
    path.join(distDirectory, fileName),
  );
}

const manifest = {
  id: `${baseUrl || ''}/`,
  name: 'Nối Vòng Tay',
  short_name: 'Nối Vòng Tay',
  description: 'Kết nối những hoàn cảnh cần hỗ trợ với cộng đồng bằng sự tử tế và minh bạch.',
  lang: 'vi',
  dir: 'ltr',
  start_url: `${baseUrl || ''}/`,
  scope: `${baseUrl || ''}/`,
  display: 'standalone',
  display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
  background_color: '#F3FBF6',
  theme_color: '#2F9B62',
  orientation: 'portrait-primary',
  categories: ['lifestyle', 'social'],
  icons: [
    {
      src: sitePath('pwa-icon-192.png'),
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: sitePath('pwa-icon-512.png'),
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

fs.mkdirSync(distDirectory, { recursive: true });
copyIcon('pwa-icon-180.png');
copyIcon('pwa-icon-192.png');
copyIcon('pwa-icon-512.png');
fs.writeFileSync(
  path.join(distDirectory, 'manifest.webmanifest'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

const indexPath = path.join(distDirectory, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const pwaHead = [
  '<!-- nvt-pwa:start -->',
  `<link rel="manifest" href="${sitePath('manifest.webmanifest')}">`,
  '<meta name="theme-color" content="#2F9B62">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="Nối Vòng Tay">',
  `<link rel="apple-touch-icon" sizes="180x180" href="${sitePath('pwa-icon-180.png')}">`,
  '<!-- nvt-pwa:end -->',
].join('');

html = html
  .replace(/<!-- nvt-pwa:start -->[\s\S]*?<!-- nvt-pwa:end -->/g, '')
  .replace(/<link rel="manifest"[^>]*>/g, '')
  .replace(/<meta name="theme-color"[^>]*>/g, '')
  .replace(/<meta name="mobile-web-app-capable"[^>]*>/g, '')
  .replace(/<meta name="apple-mobile-web-app-capable"[^>]*>/g, '')
  .replace(/<meta name="apple-mobile-web-app-status-bar-style"[^>]*>/g, '')
  .replace(/<meta name="apple-mobile-web-app-title"[^>]*>/g, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>/g, '')
  .replace('</head>', `${pwaHead}</head>`);

fs.writeFileSync(indexPath, html, 'utf8');
fs.copyFileSync(indexPath, path.join(distDirectory, '404.html'));
fs.writeFileSync(path.join(distDirectory, '.nojekyll'), '', 'utf8');
