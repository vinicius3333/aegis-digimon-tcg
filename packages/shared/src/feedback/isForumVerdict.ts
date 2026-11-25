import { FORUM_VERDICTS, type ForumVerdict } from "#shared/feedback/ForumVerdict";

export function isForumVerdict(value: unknown): value is ForumVerdict {
  return typeof value === "string" && FORUM_VERDICTS.some((verdict) => verdict === value);
}
