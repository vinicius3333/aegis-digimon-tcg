export const ForumVerdict = {
  YES: { name: "YES", value: "yes" },
  NO: { name: "NO", value: "no" },
} as const;

export type ForumVerdict = (typeof ForumVerdict)[keyof typeof ForumVerdict]["value"];

export const FORUM_VERDICTS: readonly ForumVerdict[] = Object.values(ForumVerdict).map(({ value }) => value);
