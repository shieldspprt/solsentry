'use client';

import { useEffect, useState } from 'react';

export function purgeClientStorageOnLogout() {
  if (typeof window === 'undefined') return;

  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }

  if ('indexedDB' in window && window.indexedDB.databases) {
    window.indexedDB.databases().then((dbs) => {
      dbs.forEach((db) => {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      });
    });
  }
}

export const ServiceWorkerRegister: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChunkError = (event: PromiseRejectionEvent) => {
      if (event.reason && (event.reason.name === 'ChunkLoadError' || String(event.reason).includes('Loading chunk'))) {
        window.location.reload();
      }
    };
    window.addEventListener('unhandledrejection', handleChunkError);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowUpdatePrompt(true);
              }
            });
          }
        });
      }).catch(() => {
        // Silently handle error
      });
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, []);

  const handleApplyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 border border-cyan-500/50 shadow-2xl text-sm flex items-center gap-4">
      <span className="text-slate-100 font-semibold">New version available</span>
      <button
        onClick={handleApplyUpdate}
        className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
      >
        Update Now
      </button>
    </div>
  );
};
