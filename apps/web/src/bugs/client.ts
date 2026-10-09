import type { OwnFeedbackPage, OwnFeedbackReport } from "@aegis/shared";
import { accountApi } from "../account/client";

export const MAX_BUG_REPORT_CARDS = 20;
export const MAX_BUG_REPORT_SUMMARY = 120;
export const MAX_BUG_REPORT_DESCRIPTION = 4000;
export const MAX_BUG_REPORT_OPPONENT_DECK = 120;

export const FEEDBACK_KINDS = ["bug", "improvement", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** What the reporter fills in. The build and the browser are added on the way out. */
export type BugReportDraft = {
  kind: FeedbackKind;
  summary: string;
  cardIds: readonly string[];
  description: string;
  opponentDeck?: string;
  matchId?: string;
};

/** Submission receipt, with an optional GitHub mirror. */
export type FiledBugReport = { number: number; url?: string };

export class BugReportApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(code ?? String(status));
  }
}

// Which build the reporter was on, and on what. Asking a player to type a version number gets a
// wrong version number; the client already knows both of these.
function reportContext(): { clientRevision: string; userAgent?: string } {
  return {
    clientRevision: (import.meta.env.VITE_AEGIS_REVISION as string | undefined) ?? "development",
    ...(typeof navigator === "undefined" ? {} : { userAgent: navigator.userAgent }),
  };
}

export const bugReportApi = {
  /** Whether this deployment also publishes reports on GitHub. */
  publicMirror: async (signal?: AbortSignal): Promise<boolean> => {
    const response = await fetch(`${accountApi.base}/bug-reports/limits`, { cache: "no-store", signal });
    if (!response.ok) throw new BugReportApiError(response.status);
    return ((await response.json()) as { publicMirror?: boolean }).publicMirror === true;
  },
  submit: async (draft: BugReportDraft): Promise<FiledBugReport> => {
    const response = await fetch(`${accountApi.base}/bug-reports`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, ...reportContext() }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new BugReportApiError(response.status, body.error);
    }
    return response.json() as Promise<FiledBugReport>;
  },
};

/** The signed-in reporter's own reports and what the team answered. */
export const ownFeedbackApi = {
  list: async (before?: number, signal?: AbortSignal): Promise<OwnFeedbackPage> => {
    const response = await fetch(`${accountApi.base}/feedback/mine${before === undefined ? "" : `?before=${before}`}`, {
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new BugReportApiError(response.status);
    return response.json() as Promise<OwnFeedbackPage>;
  },
  read: async (id: number, signal?: AbortSignal): Promise<OwnFeedbackReport> => {
    const response = await fetch(`${accountApi.base}/feedback/mine/${id}`, {
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new BugReportApiError(response.status);
    return response.json() as Promise<OwnFeedbackReport>;
  },
  /** Tells the team the closing answer did not solve it; allowed once per report. */
  reopen: async (id: number, comment: string): Promise<OwnFeedbackReport> => {
    const response = await fetch(`${accountApi.base}/feedback/mine/${id}/reopen`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new BugReportApiError(response.status, body.error);
    }
    return response.json() as Promise<OwnFeedbackReport>;
  },
};
