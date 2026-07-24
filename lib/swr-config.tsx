'use client';

import React from 'react';
import { SWRConfig } from 'swr';

const defaultFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`SWR HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
};

export const SWRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SWRConfig
      value={{
        fetcher: defaultFetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 10000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
};
