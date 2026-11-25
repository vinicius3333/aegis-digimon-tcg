import { ForumBoard } from "@aegis/shared/feedback/ForumBoard";

export function getForumCopyPrefix(board: ForumBoard): "bugForum" | "ideaForum" {
  return board === ForumBoard.BUGS.value ? "bugForum" : "ideaForum";
}
