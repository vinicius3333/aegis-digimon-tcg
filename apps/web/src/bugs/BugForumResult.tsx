import type { BugForumDetail, BugForumTally } from "@aegis/shared/feedback/BugForum";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useId } from "react";
import { Badge } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import "@/bugs/bugForum.css";

type BugForumResultParams = { detail: BugForumDetail; tally: BugForumTally };

export function BugForumResult({ detail, tally }: BugForumResultParams) {
  const { t } = useTranslation();
  const titleId = useId();
  const total = tally.bug + tally.notBug;
  const bugShare = total ? Math.round((tally.bug / total) * 100) : 0;
  const decided = isClosedFeedbackStatus(detail.status);
  const earned = detail.outcome !== null && detail.myVote?.verdict === detail.outcome;
  return (
    <section className="bug-result" aria-labelledby={titleId} data-outcome={detail.outcome ?? undefined}>
      <header className="bug-result__header">
        <h3 id={titleId}>{decided ? t("bugForum.result.title") : t("bugForum.result.adminTitle")}</h3>
        {detail.outcome ? (
          <Badge tone={detail.outcome === "bug" ? "danger" : "neutral"}>
            {t(`bugForum.verdict.${detail.outcome}`)}
          </Badge>
        ) : null}
      </header>
      {decided ? (
        <p className="bug-result__verdict">
          {detail.outcome === null
            ? t("bugForum.result.noPayout")
            : detail.myVote
              ? t(earned ? "bugForum.result.earned" : "bugForum.result.missed")
              : t("bugForum.result.noVote")}
        </p>
      ) : null}
      <div
        className="bug-result__bar"
        role="img"
        aria-label={t("bugForum.result.split", { bug: tally.bug, notBug: tally.notBug })}
      >
        <span data-verdict="bug" style={{ inlineSize: `${bugShare}%` }} />
        <span data-verdict="not_bug" style={{ inlineSize: `${total ? 100 - bugShare : 0}%` }} />
      </div>
      <p className="bug-result__legend">
        <span data-verdict="bug">
          {t("bugForum.verdict.bug")} · {tally.bug}
        </span>
        <span data-verdict="not_bug">
          {t("bugForum.verdict.not_bug")} · {tally.notBug}
        </span>
      </p>
      {tally.ballots.length ? (
        <ul className="bug-ballots" aria-label={t("bugForum.ballots")}>
          {tally.ballots.map((ballot, index) => (
            <li key={index} data-verdict={ballot.verdict}>
              <p>
                <strong>{ballot.authorName ?? t("bugForum.formerPlayer")}</strong>
                <span className="bug-ballots__verdict">{t(`bugForum.verdict.${ballot.verdict}`)}</span>
              </p>
              <p className="bug-ballots__reason">{ballot.reason}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
