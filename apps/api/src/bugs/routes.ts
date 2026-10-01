import { getCardDefinition } from "@aegis/shared";
import type { Express, Request, Response } from "express";
import type { AuthSession } from "../accounts/AccountStore.js";
import { tokenBucketLimiter, type TokenBucketOptions } from "../http/rateLimit.js";
import {
  FEEDBACK_KINDS,
  MAX_BUG_REPORT_CARDS,
  MAX_BUG_REPORT_DESCRIPTION,
  MAX_BUG_REPORT_OPPONENT_DECK,
  MAX_BUG_REPORT_SUMMARY,
  type FeedbackKind,
  type IssueTracker,
  type NewBugReport,
} from "./GitHubIssueTracker.js";

// A report is typed by hand, so a handful per minute is already far above human pace. The limit is
// there because every accepted report becomes a public issue, not to pace an honest reporter.
const SIGNED_IN_RATE_LIMIT: TokenBucketOptions = { capacity: 5, refillMs: 60_000 };

// An anonymous reporter is only as identifiable as their address, and an address is cheap to change,
// so the anonymous budget is much smaller than the one an account gets. It is still several reports
// per session for anyone hitting a genuinely broken card.
const ANONYMOUS_RATE_LIMIT: TokenBucketOptions = { capacity: 3, refillMs: 5 * 60_000 };

// Long enough for any real browser string, short enough that it cannot become the payload.
const MAX_USER_AGENT = 300;
const MAX_CLIENT_REVISION = 60;

export type BugReportRouteDeps = {
  app: Express;
  /** Absent when this deployment has no GitHub token; the route then answers 503. */
  tracker?: IssueTracker;
  /** The session lookup the account routes already own, so there is one cookie reader. */
  session: (req: Request) => Promise<AuthSession | undefined>;
};

/**
 * The bug-report surface: one write, open to anyone — a player who hits a broken card mid-match
 * should not have to make an account first.
 *
 * Aegis keeps no report of its own — a submission becomes an issue on the project's GitHub
 * repository, which is where the bugs get triaged and closed. Nothing to read back here.
 */
export function installBugReportRoutes({ app, tracker, session }: BugReportRouteDeps): void {
  const limitAccount = tokenBucketLimiter(SIGNED_IN_RATE_LIMIT);
  const limitAddress = tokenBucketLimiter(ANONYMOUS_RATE_LIMIT);

  app.get("/bug-reports/limits", (_req, res) => {
    res.json({
      maxCards: MAX_BUG_REPORT_CARDS,
      maxSummary: MAX_BUG_REPORT_SUMMARY,
      maxDescription: MAX_BUG_REPORT_DESCRIPTION,
      maxOpponentDeck: MAX_BUG_REPORT_OPPONENT_DECK,
      enabled: tracker !== undefined,
    });
  });

  app.post("/bug-reports", (req, res, next) => {
    submit(req, res).catch(next);
  });

  async function submit(req: Request, res: Response): Promise<void> {
    if (!tracker) {
      res.status(503).json({ error: "reports_unavailable" });
      return;
    }
    const auth = await session(req);
    // An account is its own identity; without one the caller's address is all there is to meter by,
    // and `trust proxy` is what makes that address the reporter's rather than the proxy's.
    const allowed = auth ? limitAccount(auth.account.id) : limitAddress(req.ip ?? "unknown");
    if (!allowed) {
      res.status(429).json({ error: "too_many_requests" });
      return;
    }
    const report = validate(req.body, auth?.account.displayName);
    if ("error" in report) {
      res.status(400).json({ error: report.error });
      return;
    }
    try {
      res.status(201).json(await tracker.file(report));
    } catch (failure) {
      console.error("[bug-reports] could not file an issue", failure);
      res.status(502).json({ error: "tracker_unavailable" });
    }
  }
}

/** Why a submission was refused, in the vocabulary the client renders. */
export type BugReportFailure =
  | "invalid_kind"
  | "empty_summary"
  | "summary_too_long"
  | "empty_description"
  | "description_too_long"
  | "opponent_deck_too_long"
  | "too_many_cards"
  | "unknown_card";

type SubmitBody = {
  kind?: unknown;
  summary?: unknown;
  cardIds?: unknown;
  description?: unknown;
  opponentDeck?: unknown;
  clientRevision?: unknown;
  userAgent?: unknown;
};

/**
 * The rules a report must satisfy before it becomes a public issue: a known kind, a summary and a
 * description within their length budgets, and card ids that name real cards.
 *
 * The client-carried context (revision, user agent) is trimmed rather than refused — a report is
 * worth filing even when a browser sends something odd.
 */
export function validate(body: unknown, reporterName?: string): NewBugReport | { error: BugReportFailure } {
  const input = (body ?? {}) as SubmitBody;

  // Clients from before feedback kinds existed send none, and everything they sent was a bug.
  const kind = input.kind ?? "bug";
  if (!isFeedbackKind(kind)) return { error: "invalid_kind" };

  const summary = text(input.summary);
  if (!summary) return { error: "empty_summary" };
  if (summary.length > MAX_BUG_REPORT_SUMMARY) return { error: "summary_too_long" };

  const description = text(input.description);
  if (!description) return { error: "empty_description" };
  if (description.length > MAX_BUG_REPORT_DESCRIPTION) return { error: "description_too_long" };

  const opponentDeck = text(input.opponentDeck);
  if (opponentDeck && opponentDeck.length > MAX_BUG_REPORT_OPPONENT_DECK) {
    return { error: "opponent_deck_too_long" };
  }

  const raw = Array.isArray(input.cardIds) ? input.cardIds : [];
  if (!raw.every((cardId) => typeof cardId === "string")) return { error: "unknown_card" };
  const cardIds = [...new Set((raw as string[]).map((cardId) => cardId.trim().toUpperCase()).filter(Boolean))];
  if (cardIds.length > MAX_BUG_REPORT_CARDS) return { error: "too_many_cards" };
  if (cardIds.some((cardId) => !getCardDefinition(cardId))) return { error: "unknown_card" };

  return {
    ...(reporterName ? { reporterName } : {}),
    kind,
    summary,
    cardIds,
    description,
    ...(opponentDeck ? { opponentDeck } : {}),
    ...optional("clientRevision", clip(input.clientRevision, MAX_CLIENT_REVISION)),
    ...optional("userAgent", clip(input.userAgent, MAX_USER_AGENT)),
  };
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function clip(value: unknown, limit: number): string | undefined {
  return text(value)?.slice(0, limit);
}

function optional<K extends string>(key: K, value: string | undefined): Record<K, string> | Record<string, never> {
  return value ? ({ [key]: value } as Record<K, string>) : {};
}

function isFeedbackKind(value: unknown): value is FeedbackKind {
  return FEEDBACK_KINDS.includes(value as FeedbackKind);
}
