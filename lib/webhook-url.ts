function ipv4Octets(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  return octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? octets : null;
}

/** Reject literal/local destinations that could turn callback delivery into SSRF. */
export function isPrivateWebhookHostname(rawHostname: string): boolean {
  const hostname = rawHostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return true;
  }

  const ipv4 = ipv4Octets(hostname);
  if (ipv4) {
    const [a, b] = ipv4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (hostname.startsWith('::ffff:')) {
    return isPrivateWebhookHostname(hostname.slice('::ffff:'.length));
  }
  if (hostname.includes(':')) {
    return (
      hostname === '::' ||
      hostname === '::1' ||
      hostname.startsWith('fc') ||
      hostname.startsWith('fd') ||
      hostname.startsWith('fe8') ||
      hostname.startsWith('fe9') ||
      hostname.startsWith('fea') ||
      hostname.startsWith('feb')
    );
  }
  return false;
}

export function normalizeWebhookUrl(raw: unknown, production: boolean): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) {
    throw new Error('url (callback URL) is required and must be at most 2048 characters');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('url is not a valid URL string');
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw new Error('url must not include credentials or a fragment');
  }
  if (production && isPrivateWebhookHostname(parsed.hostname)) {
    throw new Error('url must not target localhost, a private network, or a link-local address');
  }
  if (production && parsed.protocol !== 'https:') {
    throw new Error('url must use HTTPS protocol in production');
  }
  if (!production && parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('url must use HTTP or HTTPS protocol');
  }
  return parsed.toString();
}

export function isValidWebhookUrl(raw: string, production: boolean): boolean {
  try {
    normalizeWebhookUrl(raw, production);
    return true;
  } catch {
    return false;
  }
}
