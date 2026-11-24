import type { ForumDetail, ForumItem } from "@aegis/shared/feedback/Forum";
import { ForumVerdict } from "@aegis/shared/feedback/ForumVerdict";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useState } from "react";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import type { ForumApi } from "@/bugs/forumClient";
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
  const upvoted = item.myVote !== null;
  const closed = isClosedFeedbackStatus(item.status);
  const toggle = async () => {
    setSaving(true);
    try {
      onChange(
        await (upvoted ? api.retract(item.id) : api.vote(item.id, { verdict: ForumVerdict.YES.value, reason: "" })),
      );
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };
  return (
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
  );
}
