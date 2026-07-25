import React from 'react';
import type { Metadata, Viewport } from 'next';
import { WalletContextProvider } from '../components/layout/WalletContextProvider';
import { ServiceWorkerRegister } from '../components/layout/ServiceWorkerRegister';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solsentry.io';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SolSentry | Transaction Guard and Risk Engine for Solana AI Agents',
    template: '%s | SolSentry Solana',
  },
  description:
    'A transaction guard for Solana AI agents. It simulates a transaction before signing, detects wallet drainer patterns, and scores protocol risk from live sources. Available over MCP, a TypeScript SDK, a CLI, and REST.',
  keywords: [
    'Solana',
    'SolSentry',
    'AI Agents',
    'Transaction Simulator',
    'Wallet Drainer Detection',
    'DeFi Risk Engine',
    'MCP Server',
    'Pyth Oracle',
    'Kamino Finance',
    'Jupiter Exchange',
    'Drift Protocol',
    'Quantitative Risk Score',
  ],
  authors: [{ name: 'SolSentry Security Team', url: siteUrl }],
  creator: 'SolSentry',
  publisher: 'SolSentry',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'SolSentry | Transaction Guard and Risk Engine for Solana AI Agents',
    description:
      'Simulate a transaction before signing, detect wallet drainer patterns, and score protocol risk from live sources. For Solana AI trading agents.',
    siteName: 'SolSentry',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'SolSentry Solana AI Agent Risk Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SolSentry | Transaction Guard for Solana AI Agents',
    description:
      'One call before signing. Simulate a transaction, catch wallet drainers, and score protocol risk from live sources.',
    site: '@SolSentry',
    creator: '@SolSentry',
    images: [`${siteUrl}/og-image.png`],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SolSentry',
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0e17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SolSentry',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Solana Mainnet Beta',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
    },
    description:
      'A transaction guard for Solana AI agents. Simulate before signing, detect wallet drainers, and score protocol risk from live sources.',
    url: siteUrl,
  };

  return (
    <html lang="en" className="dark">
      <head>
        {/* JSON-LD must go through dangerouslySetInnerHTML. Passed as a child,
            React HTML-escapes the quotes on the server but not on the client,
            so hydration hits a text mismatch and throws away the entire
            server-rendered document to re-render it client-side. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[var(--color-bg)] text-slate-100 min-h-screen font-sans antialiased">
        <WalletContextProvider>
          <ServiceWorkerRegister />
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
