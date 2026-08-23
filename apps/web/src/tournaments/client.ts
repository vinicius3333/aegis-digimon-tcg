/* The tournament HTTP surface, following the `accountApi` pattern in ../account/client.
   Three differences: every response feeds the server clock with the round trip it was measured
   over, failures are returned as typed values instead of thrown strings (the reason code IS the
   message the UI must render), and every call accepts an `AbortSignal` so a screen can invalidate
   its in-flight requests on unmount. */

import { accountApi } from "../account/client";
import { observeResponseDate, observeServerTime } from "./serverClock";
import type {
  DeckViolation,
  TournamentDetail,
  TournamentListing,
  TournamentValidationError,
  TournamentWindows,
} from "./types";
import type { CreateTournamentInput } from "@aegis/shared";

export type ApiError = {
  status: number;
  /** The server's `error` field: a `ParticipantFailure`, a bare message, or "invalid tournament". */
  code: string;
  reasons?: TournamentValidationError[];
  violations?: DeckViolation[];
};

export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

async function send<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const sentAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${accountApi.base}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // An abort lands here too; the caller's ordering guard is what distinguishes them, and
    // neither ever reaches the clock.
    return { ok: false, error: { status: 0, code: "network_error" } };
  }
  observeResponseDate(response, sentAt);

  const body = await readJson(response);
  if (body && typeof body === "object" && "serverNow" in body && typeof body.serverNow === "number") {
    // A millisecond field needs no granularity correction, unlike the whole-second `Date` header.
    observeServerTime({ serverEpochMs: body.serverNow, sentAt, receivedAt: Date.now(), granularityMs: 0 });
  }
  if (!response.ok) {
    const failure = body as
      | { error?: string; reasons?: TournamentValidationError[]; violations?: DeckViolation[] }
      | undefined;
    return {
      ok: false,
      error: {
        status: response.status,
        code: failure?.error ?? String(response.status),
        reasons: failure?.reasons,
        violations: failure?.violations,
      },
    };
  }
  return { ok: true, value: body as T };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export const tournamentApi = {
  list: (signal?: AbortSignal) => send<TournamentListing[]>("/tournaments", { signal }),
  detail: (id: string, signal?: AbortSignal) =>
    send<TournamentDetail>(`/tournaments/${encodeURIComponent(id)}`, { signal }),
  create: (input: CreateTournamentInput & { block?: string }) =>
    send<TournamentDetail>("/tournaments", { method: "POST", body: JSON.stringify(input) }),
  register: (id: string, savedDeckId: string) =>
    send<unknown>(`/tournaments/${encodeURIComponent(id)}/participants`, {
      method: "POST",
      body: JSON.stringify({ savedDeckId }),
    }),
  checkIn: (id: string) =>
    send<unknown>(`/tournaments/${encodeURIComponent(id)}/check-in`, { method: "POST", body: "{}" }),
  drop: (id: string) => send<unknown>(`/tournaments/${encodeURIComponent(id)}/drop`, { method: "POST", body: "{}" }),
  setWindows: (id: string, windows: Partial<TournamentWindows>) =>
    send<TournamentWindows>(`/tournaments/${encodeURIComponent(id)}/windows`, {
      method: "POST",
      body: JSON.stringify(windows),
    }),
  closeCheckIn: (id: string) =>
    send<unknown>(`/tournaments/${encodeURIComponent(id)}/close-check-in`, { method: "POST", body: "{}" }),
  remove: (id: string) => send<unknown>(`/tournaments/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
