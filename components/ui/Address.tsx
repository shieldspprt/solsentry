'use client';

import React, { useState } from 'react';

export interface AddressProps {
  address: string;
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
  explorer?: 'solscan' | 'explorer' | 'solanafm';
  showCopy?: boolean;
  className?: string;
}

export const Address: React.FC<AddressProps> = ({
  address,
  cluster = 'mainnet-beta',
  explorer = 'solscan',
  showCopy = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!address) return <span className="text-slate-400 font-mono text-xs">N/A</span>;

  const truncated = `${address.slice(0, 4)}...${address.slice(-4)}`;

  const getExplorerUrl = () => {
    const clusterParam = cluster !== 'mainnet-beta' ? `?cluster=${cluster}` : '';
    if (explorer === 'solanafm') return `https://solana.fm/address/${address}${clusterParam}`;
    if (explorer === 'explorer') return `https://explorer.solana.com/address/${address}${clusterParam}`;
    return `https://solscan.io/account/${address}${clusterParam}`;
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={`inline-flex items-center gap-2 font-mono text-sm ${className}`} title={address}>
      <a
        href={getExplorerUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-300 hover:text-cyan-200 hover:underline font-bold transition-colors"
      >
        {truncated}
      </a>
      {showCopy && (
        <button
          onClick={handleCopy}
          type="button"
          className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all font-sans"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </span>
  );
};
