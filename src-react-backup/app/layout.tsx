import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: '$ASDFASDFA - Ecosystem Hub',
  description: 'The $asdfasdfa ecosystem hub. Learn, Build, Play, and Explore tools. This is fine.',
  keywords: ['asdfasdfa', 'solana', 'crypto', 'ecosystem', 'burn', 'token'],
  authors: [{ name: 'ASDFASDFA Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alonisthe.dev/',
    siteName: '$ASDFASDFA',
    title: '$ASDFASDFA - Ecosystem Hub',
    description: 'The $asdfasdfa ecosystem hub. Learn, Build, Play, and Explore tools.',
    images: [
      {
        url: 'https://alonisthe.dev/og-image.png',
        width: 1200,
        height: 630,
        alt: '$ASDFASDFA Hub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '$ASDFASDFA - Ecosystem Hub',
    description: 'The $asdfasdfa ecosystem hub. Learn, Build, Play, and Explore tools.',
    images: ['https://alonisthe.dev/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
