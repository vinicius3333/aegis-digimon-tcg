import type { BugForumDetail } from "@aegis/shared/feedback/BugForum";
import { BUG_VERDICTS, type BugVerdict } from "@aegis/shared/feedback/BugVerdict";
import { MAX_BUG_VOTE_REASON, MIN_BUG_VOTE_REASON } from "@aegis/shared/feedback/limits";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useEffect, useId, useState } from "react";
import { Icons } from "@/design/icons";
import { Alert, Badge, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { BugForumConversation } from "@/bugs/BugForumConversation";
import { BugForumResult } from "@/bugs/BugForumResult";
import { bugForumApi } from "@/bugs/bugForumClient";
import { BugReportApiError } from "@/bugs/client";
import { FEEDBACK_STATUS_TONE } from "@/bugs/feedbackStatus";
import { getBugForumError } from "@/bugs/getBugForumError";
import "@/bugs/bugForum.css";

type BugForumThreadParams = { bugId: number; onBack: () => void };

export function BugForumThread({ bugId, onBack }: BugForumThreadParams) {
  const { t, locale } = useTranslation();
  const [detail, setDetail] = useState<BugForumDetail>();
  const [failed, setFailed] = useState<"missing" | "error">();

  useEffect(() => {
    const controller = new AbortController();
    void bugForumApi
      .read(bugId, controller.signal)
      .then(setDetail)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFailed(error instanceof BugReportApiError && error.status === 404 ? "missing" : "error");
      });
    return () => controller.abort();
  }, [bugId]);

  const back = (
    <Button variant="ghost" size="sm" className="bug-thread__back" icon={Icons.ArrowLeft} onClick={onBack}>
      {t("bugForum.back")}
    </Button>
  );

  if (failed) {
    return (
      <div className="bug-thread">
        {back}
        <Alert tone="warning" title={t(failed === "missing" ? "bugForum.missing" : "bugForum.failed")} />
      </div>
    );
  }
  if (!detail) return <p role="status">{t("common.loading")}</p>;

  return (
    <article className="bug-thread">
      {back}
      <div className="bug-thread__layout">
        <section className="bug-thread__report" aria-labelledby="bug-thread-title">
          <p className="bug-thread__meta">
            <span className="bug-forum-row__meta">
              #{detail.id} · {new Date(detail.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
            </span>
            <Badge tone={FEEDBACK_STATUS_TONE[detail.status]}>{t(`feedback.status.${detail.status}`)}</Badge>
          </p>
          <h2 id="bug-thread-title">{detail.summary}</h2>
          <p className="bug-thread__description">{detail.description}</p>
          {detail.cardIds.length ? (
            <ul className="bug-forum-cards" aria-label={t("bugReport.cardsLabel")}>
              {detail.cardIds.map((cardId) => (
                <li key={cardId}>{cardId}</li>
              ))}
            </ul>
          ) : null}
        </section>
        <aside className="bug-thread__aside">
          {detail.tally ? (
            <BugForumResult detail={detail} tally={detail.tally} />
          ) : (
            <BugForumVotePanel detail={detail} onChange={setDetail} />
          )}
        </aside>
        <div className="bug-thread__discussion">
          <BugForumConversation detail={detail} onChange={setDetail} />
        </div>
      </div>
    </article>
  );
}

const VERDICT_ICON = { bug: Icons.Bug, not_bug: Icons.CircleCheck } as const;

function BugForumVotePanel({
  detail,
  onChange,
}: {
  detail: BugForumDetail;
  onChange: (detail: BugForumDetail) => void;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [verdict, setVerdict] = useState<BugVerdict | undefined>(detail.myVote?.verdict);
  const [reason, setReason] = useState(detail.myVote?.reason ?? "");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();

  if (isClosedFeedbackStatus(detail.status)) return null;
  if (detail.ownReport) {
    return (
      <section className="bug-vote" data-locked>
        <h3>{t("bugForum.voteTitle")}</h3>
        <p className="bug-thread-muted">{t("bugForum.ownReport")}</p>
      </section>
    );
  }

  const ready = verdict !== undefined && reason.trim().length >= MIN_BUG_VOTE_REASON;
  const unchanged = detail.myVote?.verdict === verdict && detail.myVote?.reason === reason.trim();

  const save = async (work: () => Promise<BugForumDetail>) => {
    setSaving(true);
    setFailure(undefined);
    try {
      const next = await work();
      onChange(next);
      setVerdict(next.myVote?.verdict);
      setReason(next.myVote?.reason ?? "");
    } catch (error) {
      setFailure(getBugForumError(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bug-vote" aria-labelledby={`${fieldId}-title`}>
      <header className="bug-vote__header">
        <h3 id={`${fieldId}-title`}>{t("bugForum.voteTitle")}</h3>
        <p>
          <Icons.Lock size={13} aria-hidden="true" /> {t("bugForum.voteHidden")}
        </p>
      </header>
      {detail.myVote ? (
        <p className="bug-vote__saved" role="status">
          <Icons.CircleCheck size={16} aria-hidden="true" />
          {t(`bugForum.youVoted.${detail.myVote.verdict}`)}
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !saving && verdict) void save(() => bugForumApi.vote(detail.id, { verdict, reason }));
        }}
      >
        <div className="bug-vote__options" role="radiogroup" aria-labelledby={`${fieldId}-title`}>
          {BUG_VERDICTS.map((option) => {
            const Icon = VERDICT_ICON[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={verdict === option}
                className="bug-vote__option"
                data-verdict={option}
                onClick={() => setVerdict(option)}
              >
                <span className="bug-vote__icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span>
                  <b>{t(`bugForum.verdict.${option}`)}</b>
                  <small>{t(`bugForum.verdictHint.${option}`)}</small>
                </span>
              </button>
            );
          })}
        </div>
        <label htmlFor={fieldId}>{t("bugForum.reasonLabel")}</label>
        <textarea
          id={fieldId}
          rows={3}
          value={reason}
          maxLength={MAX_BUG_VOTE_REASON}
          placeholder={t("bugForum.reasonPlaceholder")}
          aria-describedby={`${fieldId}-hint`}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="bug-compose__footer">
          <small id={`${fieldId}-hint`}>
            {t("bugForum.reasonHint", { count: MIN_BUG_VOTE_REASON })} · {reason.length} / {MAX_BUG_VOTE_REASON}
          </small>
          <div className="bug-vote__actions">
            {detail.myVote ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => void save(() => bugForumApi.retract(detail.id))}
              >
                {t("bugForum.removeVote")}
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={!ready || saving || unchanged}>
              {t(detail.myVote ? "bugForum.updateVote" : "bugForum.castVote")}
            </Button>
          </div>
        </div>
        {failure ? <Alert tone="danger" title={failure} /> : null}
      </form>
    </section>
  );
}
