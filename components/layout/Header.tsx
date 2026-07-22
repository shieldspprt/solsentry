'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '../ui/Button';
import { formatTruncateAddress } from '../../lib/formatters';

export interface HeaderProps {
  userEmail?: string;
}

export const Header: React.FC<HeaderProps> = () => {
  const { publicKey, connected, signMessage } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleWalletAuth = async () => {
    if (!publicKey || !signMessage) return;
    try {
      const messageText = `Sign-In to AgentGate Risk Engine\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      await signMessage(new TextEncoder().encode(messageText));
      setIsAuthenticated(true);
    } catch {
      // cancelled
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 lg:h-20 border-b border-[var(--color-border)] bg-[#0a0e17]/85 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between pt-safe">
      {/* Logo on mobile (sidebar is hidden); status pill on desktop */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="lg:hidden flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400/25 to-blue-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black text-lg">
            A
          </div>
          <span className="font-extrabold text-slate-50 text-lg tracking-tight">AgentGate</span>
        </Link>
        <span className="hidden lg:inline-flex items-center gap-2 text-[13px] font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Solana Mainnet · Live
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {connected && publicKey && (
          isAuthenticated ? (
            <span className="hidden sm:inline text-[13px] text-emerald-300 font-semibold px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              ✓ {formatTruncateAddress(publicKey.toBase58())}
            </span>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleWalletAuth}>
              Sign In
            </Button>
          )
        )}
        <WalletMultiButton style={{ backgroundColor: '#06b6d4', color: '#04121a', height: '44px', borderRadius: '12px', fontSize: '14px', fontWeight: '600' }} />
      </div>
    </header>
  );
};
