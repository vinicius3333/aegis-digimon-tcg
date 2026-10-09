import type { FeedbackStatus } from "@aegis/shared";
import type { BadgeTone } from "../design/primitives";

/** Status hues carry meaning, never selection, so open work is amber and only closure is green or red. */
export const FEEDBACK_STATUS_TONE: Record<FeedbackStatus, BadgeTone> = {
  new: "neutral",
  triaged: "warning",
  in_progress: "warning",
  resolved: "success",
  wont_fix: "danger",
  duplicate: "neutral",
};

/** The reporter's four-step view: the three closing statuses share the last step. */
export const FEEDBACK_PROGRESS_STEPS = ["new", "triaged", "in_progress", "closed"] as const;
export type FeedbackProgressStep = (typeof FEEDBACK_PROGRESS_STEPS)[number];

export function progressStep(status: FeedbackStatus): FeedbackProgressStep {
  return status === "resolved" || status === "wont_fix" || status === "duplicate" ? "closed" : status;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60_000],
  ["month", 30 * 24 * 60 * 60_000],
  ["week", 7 * 24 * 60 * 60_000],
  ["day", 24 * 60 * 60_000],
  ["hour", 60 * 60_000],
  ["minute", 60_000],
];

export function relativeTime(at: number, locale: string, now = Date.now()): string {
  const elapsed = at - now;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(elapsed) >= size) return format.format(Math.round(elapsed / size), unit);
  }
  return format.format(0, "minute");
}
