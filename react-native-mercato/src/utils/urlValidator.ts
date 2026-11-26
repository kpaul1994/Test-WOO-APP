export type UrlValidationResult =
  | { valid: true; normalizedBaseUrl: string; host: string }
  | { valid: false; reason: string };

function isDisallowedHost(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  if (ipv4.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
    const [a, b] = parts;
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  if (host.includes(':') || host.startsWith('[')) {
    const clean = host.replace(/^\[|\]$/g, '').toLowerCase();
    if (clean === '::1' || clean.startsWith('fe80') || clean.startsWith('fc') || clean.startsWith('fd')) {
      return true;
    }
  }
  return false;
}

export function validateAndNormalizeStoreUrl(rawInput: string): UrlValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Please enter your WooCommerce store URL.' };
  }
  if (/^http:\/\//i.test(trimmed)) {
    return {
      valid: false,
      reason: 'HTTPS is required to keep your WooCommerce API keys encrypted in transit.',
    };
  }
  const withScheme = /^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const cleaned = `${withScheme.split('/wp-json')[0].replace(/\/+$/, '')}/`;

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return { valid: false, reason: 'Enter a valid domain URL (e.g. https://yourstore.com).' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS store URLs are supported.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes('.')) {
    return { valid: false, reason: 'Enter a complete store domain (e.g. https://shop.example.com).' };
  }

  if (isDisallowedHost(host)) {
    return { valid: false, reason: 'Local, loopback, and private network addresses cannot be used.' };
  }

  const portPart = parsed.port ? `:${parsed.port}` : '';
  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  const basePath = pathSegments.length ? `/${pathSegments.join('/')}/` : '/';
  return {
    valid: true,
    normalizedBaseUrl: `https://${host}${portPart}${basePath}`,
    host,
  };
}
