import { BUG_VERDICTS, type BugVerdict } from "#shared/feedback/BugVerdict";

export function isBugVerdict(value: unknown): value is BugVerdict {
  return typeof value === "string" && BUG_VERDICTS.some((verdict) => verdict === value);
}
