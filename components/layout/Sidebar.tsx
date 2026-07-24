'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NavIcon } from './NavIcons';
import { NAV_ITEMS, isActivePath } from './nav-items';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handlePrefetch = (href: string) => {
    try {
      router.prefetch(href);
    } catch {
      // Ignore
    }
  };

  const handleClick = (href: string) => {
    setPendingHref(href);
  };

  return (
    <aside className="hidden lg:flex w-64 bg-[#0a0e17]/80 border-r border-[var(--color-border)] flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        <Link href="/" prefetch={true} className="h-20 px-6 flex items-center gap-3 border-b border-[var(--color-border)] hover:opacity-90 transition-opacity">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400/25 to-blue-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black text-xl">
            S
          </div>
          <span className="font-extrabold text-slate-50 text-xl tracking-tight">SolSentry</span>
        </Link>

        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = pendingHref ? pendingHref === item.href : isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => handlePrefetch(item.href)}
                onPointerDown={() => handlePrefetch(item.href)}
                onClick={() => handleClick(item.href)}
                className={`px-4 py-3 rounded-2xl text-[15px] font-semibold transition-all flex items-center gap-3.5 w-full cursor-pointer select-none active:scale-[0.98] ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]'
                    : 'text-slate-300 hover:text-slate-50 hover:bg-white/[0.04]'
                }`}
              >
                <NavIcon name={item.key} className={`w-[22px] h-[22px] ${active ? 'text-cyan-300' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-5 m-4 rounded-2xl bg-white/[0.03] border border-[var(--color-border)] text-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Engine</span>
          <span className="font-mono text-slate-200 font-semibold text-[13px]">v3.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Status</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-2 text-[13px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </aside>
  );
};
