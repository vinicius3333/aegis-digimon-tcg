import { ForumBoard } from "#shared/feedback/ForumBoard";

export function getForumBoardKind(board: ForumBoard): "bug" | "improvement" {
  return board === ForumBoard.BUGS.value ? ForumBoard.BUGS.feedbackKind : ForumBoard.IDEAS.feedbackKind;
}
