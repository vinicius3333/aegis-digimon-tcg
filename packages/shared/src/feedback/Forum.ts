import type { ForumVerdict } from "#shared/feedback/ForumVerdict";
import type { FeedbackStatus } from "#shared/feedback/FeedbackStatus";

export const ForumState = {
  OPEN: { name: "OPEN", value: "open" },
  DECIDED: { name: "DECIDED", value: "decided" },
} as const;

export type ForumState = (typeof ForumState)[keyof typeof ForumState]["value"];

export const FORUM_PAGE_SIZE = 10;

export type ForumVote = { verdict: ForumVerdict; reason: string };

export type ForumBallot = ForumVote & { authorName: string | null; voterId?: string };

export type ForumComment = { id: number; authorName: string | null; body: string; createdAt: number };

export type ForumTally = { yes: number; no: number; ballots: ForumBallot[] };

export type ForumItem = {
  id: number;
  summary: string;
  description: string;
  cardIds: string[];
  status: FeedbackStatus;
  createdAt: number;
  commentCount: number;
  outcome: ForumVerdict | null;
  myVote: ForumVote | null;
  ownReport: boolean;
  hasReplay: boolean;
  upvotes: number | null;
};

export type ForumDetail = ForumItem & {
  comments: ForumComment[];
  teamReply: string | null;
  tally: ForumTally | null;
  canModerate: boolean;
};

export type ForumPage = { items: ForumItem[]; page: number; pageSize: number; total: number };

export type ForumSummary = { open: number; awaitingVote: number | null; aegisCoins: number | null };

export type ForumFailure =
  | "not_found"
  | "closed"
  | "own_report"
  | "invalid_verdict"
  | "reason_too_short"
  | "reason_too_long"
  | "empty_comment"
  | "comment_too_long"
  | "blocked_text"
  | "admin_required"
  | "replay_not_found"
  | "replay_unavailable";
