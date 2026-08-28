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
    const hostname = new URL(requestOrigin).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
      return requestOrigin;
    }
  } catch {
    // A malformed Origin is never reflected.
  }
  return undefined;
}
