export const ForumBoard = {
  BUGS: { name: "BUGS", value: "bugs", feedbackKind: "bug" },
  IDEAS: { name: "IDEAS", value: "ideas", feedbackKind: "improvement" },
} as const;

export type ForumBoard = (typeof ForumBoard)[keyof typeof ForumBoard]["value"];

export const FORUM_BOARDS: readonly ForumBoard[] = Object.values(ForumBoard).map(({ value }) => value);
