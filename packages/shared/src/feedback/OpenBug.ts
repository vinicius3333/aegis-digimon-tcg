import type { FeedbackStatus } from "#shared/feedback/FeedbackStatus";

export type BugVolunteerNote = { id: number; authorName: string | null; body: string; createdAt: number };

export type OpenBug = {
  id: number;
  summary: string;
  description: string;
  cardIds: string[];
  status: FeedbackStatus;
  createdAt: number;
  volunteerNames: string[];
  claimedByMe: boolean;
  noteCount: number;
};

export type OpenBugDetail = OpenBug & { notes: BugVolunteerNote[] };

export type OpenBugPage = { items: OpenBug[]; nextBefore: number | null };

export type BugVolunteerFailure = "not_found" | "closed" | "empty_note" | "note_too_long";
