import { ForumVerdict } from "@aegis/shared/feedback/ForumVerdict";
import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import type { FeedbackKind } from "@aegis/shared/feedback/types";

type Params = { kind: FeedbackKind; status: FeedbackStatus; confirmedBug: boolean };

export function getForumOutcome({ kind, status, confirmedBug }: Params): ForumVerdict | null {
  if (kind !== "bug" || !isClosedFeedbackStatus(status)) return null;
  if (confirmedBug) return ForumVerdict.YES.value;
  return status === FeedbackStatus.WONT_FIX.value ? ForumVerdict.NO.value : null;
}
