import { accountApi } from "@/account/client";
import type { ApiResult } from "@/tournaments/client";
import { observeServerTime } from "@/tournaments/serverClock";
type Params = { code?: string; action?: string; body?: unknown; signal?: AbortSignal };
export async function requestPrivateSealed<T>({ code, action, body, signal }: Params): Promise<ApiResult<T>> {
  const sentAt = Date.now();
  try {
    const response = await fetch(
      `${accountApi.base}/private-sealed${code ? `/${encodeURIComponent(code)}` : ""}${action ? `/${action}` : ""}`,
      {
        credentials: "include",
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      },
    );
    const value = await response.json();
    if (!response.ok) {
      return { ok: false, error: { status: response.status, code: value.error ?? "private_sealed_error" } };
    }
    if (typeof value.serverNow === "number") {
      observeServerTime({ serverEpochMs: value.serverNow, sentAt, receivedAt: Date.now(), granularityMs: 0 });
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: { status: 0, code: "network_error" } };
  }
}
