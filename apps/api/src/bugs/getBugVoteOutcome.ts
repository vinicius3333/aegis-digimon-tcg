import { BugVerdict } from "@aegis/shared/feedback/BugVerdict";
import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import type { FeedbackKind } from "@aegis/shared/feedback/types";

type Params = { kind: FeedbackKind; status: FeedbackStatus; confirmedBug: boolean };

export function getBugVoteOutcome({ kind, status, confirmedBug }: Params): BugVerdict | null {
  if (kind !== "bug" || !isClosedFeedbackStatus(status)) return null;
  if (confirmedBug) return BugVerdict.BUG.value;
  return status === FeedbackStatus.WONT_FIX.value ? BugVerdict.NOT_BUG.value : null;
}
