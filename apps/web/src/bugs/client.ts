import { accountApi } from "../account/client";

export const MAX_BUG_REPORT_CARDS = 20;
export const MAX_BUG_REPORT_SUMMARY = 120;
export const MAX_BUG_REPORT_DESCRIPTION = 4000;
export const MAX_BUG_REPORT_OPPONENT_DECK = 120;

/** What the reporter fills in. The build and the browser are added on the way out. */
export type BugReportDraft = {
  summary: string;
  cardIds: readonly string[];
  description: string;
  opponentDeck?: string;
  attachmentUrl?: string;
};

/** The GitHub issue a report became, which the dialog links to. */
export type FiledBugReport = { number: number; url: string };

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
