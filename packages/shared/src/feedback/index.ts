/** Where a feedback report is in its triage, in lifecycle order. */
export const FEEDBACK_STATUSES = ["new", "triaged", "in_progress", "resolved", "wont_fix", "duplicate"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** Statuses that end a report's lifecycle. Each one owes the reporter a final reply. */
export const CLOSED_FEEDBACK_STATUSES = [
  "resolved",
  "wont_fix",
  "duplicate",
] as const satisfies readonly FeedbackStatus[];
export type ClosedFeedbackStatus = (typeof CLOSED_FEEDBACK_STATUSES)[number];

export const MAX_FEEDBACK_FINAL_REPLY = 2000;
export const MAX_FEEDBACK_INTERNAL_NOTE = 2000;
export const MAX_FEEDBACK_SEARCH = 80;
export const MAX_FEEDBACK_REOPEN_COMMENT = 1000;
/** How long after closure a reporter may say the answer did not solve their problem. */
export const FEEDBACK_REOPEN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return FEEDBACK_STATUSES.includes(value as FeedbackStatus);
}

export function isClosedFeedbackStatus(status: FeedbackStatus): status is ClosedFeedbackStatus {
  return CLOSED_FEEDBACK_STATUSES.includes(status as ClosedFeedbackStatus);
}

export type FeedbackKind = "bug" | "improvement" | "other";

/**
 * One recorded status transition. `from` is null for the report's creation. A reporter's reopening
 * is the only change they make, and it always carries their comment.
 */
export type FeedbackStatusChange = {
  from: FeedbackStatus | null;
  to: FeedbackStatus;
  at: number;
  byReporter: boolean;
  comment: string | null;
};

/** What the reporter sees of their own report. Admin-only fields never appear here. */
export type OwnFeedbackReport = {
  id: number;
  kind: FeedbackKind;
  summary: string;
  description: string;
  cardIds: string[];
  createdAt: number;
  status: FeedbackStatus;
  /** Present only once the report is closed. */
  finalReply: string | null;
  duplicateOfId: number | null;
  history: FeedbackStatusChange[];
  /** Until when the reporter may reopen it; null once that is no longer possible. */
  reopenDeadline: number | null;
  /** The team confirmed it as a real bug, which earned the reporter a point. */
  confirmedBug: boolean;
};

export type FeedbackReopenFailure =
  | "empty_comment"
  | "comment_too_long"
  | "not_closed"
  | "already_reopened"
  | "reopen_window_closed"
  | "not_found";

export type OwnFeedbackPage = {
  items: OwnFeedbackReport[];
  nextBefore: number | null;
  /** How many of the reporter's reports the team confirmed as real bugs: their points. */
  confirmedBugs: number;
};

/** The edit an admin sends. `revision` is the one they read; a stale one is refused. */
export type FeedbackTriageUpdate = {
  revision: number;
  status: FeedbackStatus;
  finalReply: string;
  internalNote: string;
  duplicateOfId: number | null;
  /** Absent keeps the current judgment. Duplicates never count: the original holds the point. */
  confirmedBug?: boolean;
};

export type FeedbackTriageFailure =
  | "invalid_status"
  | "invalid_revision"
  | "final_reply_required"
  | "final_reply_too_long"
  | "internal_note_too_long"
  | "duplicate_target_required"
  | "invalid_duplicate_target"
  | "stale_revision"
  | "not_found";

export const NOTIFICATION_KINDS = ["feedback_update"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type FeedbackUpdateNotification = {
  feedbackId: number;
  summary: string;
  status: FeedbackStatus;
  previousStatus: FeedbackStatus;
  /** The start of the final reply, when the update carried one. */
  replyExcerpt: string | null;
  /** This update confirmed the report as a real bug and earned the reporter a point. */
  bugConfirmed: boolean;
};

export type AccountNotification = {
  id: number;
  kind: "feedback_update";
  payload: FeedbackUpdateNotification;
  createdAt: number;
  readAt: number | null;
};

export type NotificationPage = { items: AccountNotification[]; nextBefore: number | null; unread: number };
