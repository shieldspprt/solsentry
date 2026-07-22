'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from './NavIcons';
import { NAV_ITEMS, isActivePath } from './nav-items';

// Fixed bottom navigation for mobile/PWA. Large touch targets, safe-area aware.
export const MobileTabBar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0e17]/95 backdrop-blur-xl border-t border-[var(--color-border)] pb-safe">
      <div className="grid grid-cols-6">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-[58px] transition-colors ${
                active ? 'text-cyan-300' : 'text-slate-400 active:text-slate-100'
              }`}
            >
              <NavIcon name={item.key} className="w-[22px] h-[22px]" />
              <span className="text-[10.5px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
