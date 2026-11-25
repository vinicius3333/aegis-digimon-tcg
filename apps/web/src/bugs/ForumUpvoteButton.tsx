import type { ForumDetail, ForumItem } from "@aegis/shared/feedback/Forum";
import { ForumVerdict } from "@aegis/shared/feedback/ForumVerdict";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useState } from "react";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import type { ForumApi } from "@/bugs/forumClient";
import { getForumError } from "@/bugs/getForumError";
import "@/bugs/forum.css";

type ForumUpvoteButtonParams = {
  api: ForumApi;
  item: ForumItem;
  size?: "sm" | "lg";
  onChange: (detail: ForumDetail) => void;
};

export function ForumUpvoteButton({ api, item, size = "sm", onChange }: ForumUpvoteButtonParams) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const upvoted = item.myVote !== null;
  const closed = isClosedFeedbackStatus(item.status);
  const toggle = async () => {
    setSaving(true);
    setFailure(undefined);
    try {
      onChange(
        await (upvoted ? api.retract(item.id) : api.vote(item.id, { verdict: ForumVerdict.YES.value, reason: "" })),
      );
    } catch (error) {
      setFailure(getForumError(error, t));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className="forum-upvote"
        data-size={size}
        aria-pressed={upvoted}
        aria-label={t("ideaForum.upvoteLabel", { title: item.summary, count: item.upvotes ?? 0 })}
        disabled={saving || closed}
        onClick={() => void toggle()}
      >
        <Icons.ChevronUp size={size === "lg" ? 20 : 16} aria-hidden="true" />
        <b>{item.upvotes ?? 0}</b>
        {size === "lg" ? <span>{t(upvoted ? "ideaForum.upvoted" : "ideaForum.upvote")}</span> : null}
      </button>
      {failure ? (
        <span className="forum-upvote__error" role="alert">
          {failure}
        </span>
      ) : null}
    </>
  );
}
