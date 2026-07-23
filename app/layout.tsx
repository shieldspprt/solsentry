import React from 'react';
import type { Metadata, Viewport } from 'next';
import { WalletContextProvider } from '../components/layout/WalletContextProvider';
import { ServiceWorkerRegister } from '../components/layout/ServiceWorkerRegister';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solsentry.io';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SolSentry | Solana AI Agent Risk Engine & De-Leveraging Middleware',
    template: '%s | SolSentry Solana',
  },
  description: 'Real time quantitative risk scoring, position health monitoring, Pyth oracle telemetry, and automated guardrail policy enforcement for Solana AI trading agents.',
  keywords: [
    'Solana',
    'SolSentry',
    'AI Agents',
    'DeFi Risk Engine',
    'Solana AI Trading',
    'Pyth Oracle',
    'Kamino Finance',
    'Jupiter Exchange',
    'Drift Protocol',
    'Pump.fun',
    'ElizaOS Solana',
    'Solana Agent Kit',
    'De-leveraging',
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
    title: 'SolSentry | Solana AI Agent Risk Engine & De-Leveraging Middleware',
    description: 'Real time quantitative risk scoring, position liquidation monitoring, and guardrail policy enforcement for Solana AI trading agents.',
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
    title: 'SolSentry | Solana AI Agent Risk Engine',
    description: 'Real time quantitative risk scoring and de-leveraging middleware for Solana AI trading agents.',
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
    description: 'Solana AI Agent Quantitative Risk Scoring, Position Health Monitoring, and Automated De-leveraging Middleware.',
    url: siteUrl,
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
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
