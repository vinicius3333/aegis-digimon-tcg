import type { ForumDetail, ForumTally } from "@aegis/shared/feedback/Forum";
import type { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useId, useState } from "react";
import { Icons } from "@/design/icons";
import { Alert, Badge, IconButton } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import type { ForumApi } from "@/bugs/forumClient";
import { getForumError } from "@/bugs/getForumError";
import "@/bugs/forum.css";

type ForumResultParams = {
  api: ForumApi;
  board: ForumBoard;
  detail: ForumDetail;
  tally: ForumTally;
  onChange: (detail: ForumDetail) => void;
};

export function ForumResult({ api, board, detail, tally, onChange }: ForumResultParams) {
  const { t } = useTranslation();
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const total = tally.yes + tally.no;
  const yesShare = total ? Math.round((tally.yes / total) * 100) : 0;
  const decided = isClosedFeedbackStatus(detail.status);
  const earned = detail.outcome !== null && detail.myVote?.verdict === detail.outcome;

  const removeVote = async (voterId: string) => {
    setSaving(true);
    setFailure(undefined);
    try {
      onChange(await api.removeVote(detail.id, voterId));
    } catch (error) {
      setFailure(getForumError(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="forum-result"
      aria-labelledby={titleId}
      data-board={board}
      data-outcome={detail.outcome ?? undefined}
    >
      <header className="forum-result__header">
        <h3 id={titleId}>{decided ? t("bugForum.result.title") : t("bugForum.result.adminTitle")}</h3>
        {detail.outcome ? (
          <Badge tone={detail.outcome === "yes" && board === "bugs" ? "danger" : "neutral"}>
            {t(`bugForum.verdict.${detail.outcome}`)}
          </Badge>
        ) : null}
      </header>
      {decided ? (
        <p className="forum-result__verdict">
          {detail.outcome === null
            ? t("bugForum.result.noPayout")
            : detail.myVote
              ? t(earned ? "bugForum.result.earned" : "bugForum.result.missed")
              : t("bugForum.result.noVote")}
        </p>
      ) : null}
      <div
        className="forum-result__bar"
        role="img"
        aria-label={`${t(`bugForum.verdict.yes`)} ${tally.yes} · ${t(`bugForum.verdict.no`)} ${tally.no}`}
      >
        <span data-verdict="yes" style={{ inlineSize: `${yesShare}%` }} />
        <span data-verdict="no" style={{ inlineSize: `${total ? 100 - yesShare : 0}%` }} />
      </div>
      <p className="forum-result__legend">
        <span data-verdict="yes">
          {t(`bugForum.verdict.yes`)} · {tally.yes}
        </span>
        <span data-verdict="no">
          {t(`bugForum.verdict.no`)} · {tally.no}
        </span>
      </p>
      {tally.ballots.length ? (
        <ul className="forum-ballots" aria-label={t("bugForum.ballots")}>
          {tally.ballots.map((ballot, index) => (
            <li key={ballot.voterId ?? index} data-verdict={ballot.verdict}>
              <p>
                <strong>{ballot.authorName ?? t("bugForum.formerPlayer")}</strong>
                <span className="forum-ballots__verdict">{t(`bugForum.verdict.${ballot.verdict}`)}</span>
                {detail.canModerate && ballot.voterId ? (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    className="forum-moderate"
                    label={t("bugForum.deleteVote")}
                    disabled={saving}
                    onClick={() => void removeVote(ballot.voterId!)}
                  >
                    <Icons.Trash size={14} />
                  </IconButton>
                ) : null}
              </p>
              <p className="forum-ballots__reason">{ballot.reason}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {failure ? <Alert tone="danger" title={failure} /> : null}
    </section>
  );
}
