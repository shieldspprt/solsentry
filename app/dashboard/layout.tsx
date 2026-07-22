import React from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { MobileTabBar } from '../../components/layout/MobileTabBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        {/* Bottom padding leaves room for the mobile tab bar; removed on lg. */}
        <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-7 pb-28 lg:pb-10 space-y-6 sm:space-y-7">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
