import type { BugVerdict } from "#shared/feedback/BugVerdict";
import type { FeedbackStatus } from "#shared/feedback/FeedbackStatus";

export const BugForumState = {
  OPEN: { name: "OPEN", value: "open" },
  DECIDED: { name: "DECIDED", value: "decided" },
} as const;

export type BugForumState = (typeof BugForumState)[keyof typeof BugForumState]["value"];

export type BugForumVote = { verdict: BugVerdict; reason: string };

export type BugForumBallot = BugForumVote & { authorName: string | null };

export type BugForumComment = { id: number; authorName: string | null; body: string; createdAt: number };

export type BugForumTally = { bug: number; notBug: number; ballots: BugForumBallot[] };

export type BugForumItem = {
  id: number;
  summary: string;
  description: string;
  cardIds: string[];
  status: FeedbackStatus;
  createdAt: number;
  commentCount: number;
  outcome: BugVerdict | null;
  myVote: BugForumVote | null;
  ownReport: boolean;
};

export type BugForumDetail = BugForumItem & {
  comments: BugForumComment[];
  tally: BugForumTally | null;
};

export type BugForumPage = { items: BugForumItem[]; nextBefore: number | null };

export type BugForumSummary = { open: number; awaitingVote: number | null; aegisCoins: number | null };

export type BugForumFailure =
  | "not_found"
  | "closed"
  | "own_report"
  | "invalid_verdict"
  | "reason_too_short"
  | "reason_too_long"
  | "empty_comment"
  | "comment_too_long"
  | "blocked_text";
