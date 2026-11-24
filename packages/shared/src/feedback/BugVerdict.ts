export const BugVerdict = {
  BUG: { name: "BUG", value: "bug" },
  NOT_BUG: { name: "NOT_BUG", value: "not_bug" },
} as const;

export type BugVerdict = (typeof BugVerdict)[keyof typeof BugVerdict]["value"];

export const BUG_VERDICTS: readonly BugVerdict[] = Object.values(BugVerdict).map(({ value }) => value);
