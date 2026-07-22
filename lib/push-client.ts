'use client';

// Client side helper to enable web push liquidation alerts.

const DEFAULT_VAPID_PUBLIC_KEY =
  'BDLeFCgHDJUFzdtcJblKYUQyG78qOST1pYQMiYmaGP--Oqbk8Z3l99xmvvbFT4Nx-F85mEuft0o7b3_E-GeKNdc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushEnableResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'no_vapid' | 'error' };

export async function enablePushAlerts(opts: { userId?: string; agentId?: string } = {}): Promise<PushEnableResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  if (!vapidPublic) return { ok: false, reason: 'no_vapid' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
      }));

    const res = await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId: opts.userId, agentId: opts.agentId }),
    });

    return res.ok ? { ok: true } : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}
