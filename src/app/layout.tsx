import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health',
  description: 'Track progressive overload',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Health',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f8f7f4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <script src="https://accounts.google.com/gsi/client" async defer />
        <script dangerouslySetInnerHTML={{ __html: `
          try { if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark') } catch {}
        `}} />
      </head>
      <body className="h-dvh overflow-hidden antialiased transition-colors duration-300">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
