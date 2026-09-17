/** Resolve the response CORS origin without widening the production allowlist. */
export function corsOriginForRequest({
  requestOrigin,
  configuredOrigin,
  production,
}: {
  requestOrigin: string | undefined;
  configuredOrigin: string;
  production: boolean;
}): string | undefined {
  if (requestOrigin === undefined) return configuredOrigin;
  if (requestOrigin === configuredOrigin) return requestOrigin;
  if (production) return undefined;

  try {
    if (isLocalDevelopmentHost(new URL(requestOrigin).hostname)) return requestOrigin;
  } catch {
    // A malformed Origin is never reflected.
  }
  return undefined;
}

function isLocalDevelopmentHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return true;
  // Bonjour/mDNS names, which is how a Mac's dev server is reached by name on the LAN.
  if (hostname.endsWith(".local")) return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) return false;
    const [first, second] = octets as [number, number, number, number];
    // RFC 1918 private ranges, plus RFC 3927 link-local.
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 169 && second === 254) return true;
    return false;
  }
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10), as a URL hostname keeps them.
  const ipv6 = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1).toLowerCase() : undefined;
  if (ipv6 === undefined) return false;
  return /^f[cd]/.test(ipv6) || /^fe[89ab]/.test(ipv6);
}
