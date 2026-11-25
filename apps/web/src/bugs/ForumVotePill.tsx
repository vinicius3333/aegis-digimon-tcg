import type { ForumItem } from "@aegis/shared/feedback/Forum";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import "@/bugs/forum.css";

type ForumVotePillParams = {
  item: Pick<ForumItem, "ownReport" | "myVote" | "outcome">;
};

export function ForumVotePill({ item }: ForumVotePillParams) {
  const { t } = useTranslation();
  if (item.ownReport) return <span className="forum-pill">{t("bugForum.yourReport")}</span>;
  if (item.myVote) {
    return (
      <span className="forum-pill" data-tone="voted">
        <Icons.Check size={14} aria-hidden="true" />
        {t(`bugForum.youVoted.${item.myVote.verdict}`)}
      </span>
    );
  }
  if (item.outcome !== null) return null;
  return (
    <span className="forum-pill" data-tone="todo">
      {t("bugForum.votePrompt")}
    </span>
  );
}
