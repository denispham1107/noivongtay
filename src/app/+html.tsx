import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const startupCss = `
  #brand-startup {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F3FBF6;
  }
  #brand-startup img {
    width: 128px;
    height: 128px;
    object-fit: contain;
  }
`;

export default function Root({ children }: PropsWithChildren) {
  const siteBaseUrl = (process.env.EXPO_PUBLIC_SITE_BASE_URL ?? '').replace(/\/$/, '');

  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content="#F3FBF6" name="theme-color" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: startupCss }} />
      </head>
      <body>
        <div id="brand-startup"><img alt="Nối Vòng Tay" src={`${siteBaseUrl}/favicon.ico`} /></div>
        {children}
      </body>
    </html>
  );
}
