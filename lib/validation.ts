export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function sanitizeText(input: string, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is required' };
  }
  const cleanEmail = email.trim();
  if (cleanEmail.length > 254) {
    return { isValid: false, error: 'Email exceeds maximum length' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Invalid email address format' };
  }
  return { isValid: true };
}

export function validateSolanaAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: 'Solana wallet address is required' };
  }
  const cleanAddr = address.trim();
  if (cleanAddr.length < 32 || cleanAddr.length > 44) {
    return { isValid: false, error: 'Solana address must be between 32 and 44 characters' };
  }
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(cleanAddr)) {
    return { isValid: false, error: 'Solana address contains invalid characters' };
  }
  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password exceeds maximum length' };
  }
  return { isValid: true };
}

export function validateNumber(val: number, min = 0, max = 1000000000): ValidationResult {
  if (typeof val !== 'number' || isNaN(val)) {
    return { isValid: false, error: 'A valid number is required' };
  }
  if (val < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  if (val > max) {
    return { isValid: false, error: `Value cannot exceed ${max}` };
  }
  return { isValid: true };
}

export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || typeof apiKey !== 'string') {
    return { isValid: false, error: 'API key is required' };
  }
  const cleanKey = apiKey.trim();
  if (!cleanKey.startsWith('ag_')) {
    return { isValid: false, error: 'Invalid API key format' };
  }
  if (cleanKey.length !== 35) {
    return { isValid: false, error: 'API key length is invalid' };
  }
  return { isValid: true };
}

export function validateUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }
  const cleanUrl = url.trim();
  if (cleanUrl.length > 2048) {
    return { isValid: false, error: 'URL exceeds maximum length' };
  }
  try {
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL protocol must be HTTP or HTTPS' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
