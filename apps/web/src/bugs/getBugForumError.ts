import { MIN_BUG_VOTE_REASON } from "@aegis/shared/feedback/limits";
import type { Translate } from "@/i18n/translationTypes";
import { BugReportApiError } from "@/bugs/client";

const KNOWN = ["closed", "own_report", "reason_too_short", "blocked_text"] as const;

export function getBugForumError(error: unknown, t: Translate): string {
  const code = error instanceof BugReportApiError ? error.code : undefined;
  const known = KNOWN.find((entry) => entry === code);
  return t(known ? `bugForum.error.${known}` : "bugForum.error.generic", { count: MIN_BUG_VOTE_REASON });
}
