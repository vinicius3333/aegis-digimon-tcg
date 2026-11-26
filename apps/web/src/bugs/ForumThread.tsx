import type { MatchReplay } from "@aegis/shared";
import type { ForumDetail } from "@aegis/shared/feedback/Forum";
import { FORUM_VERDICTS, type ForumVerdict } from "@aegis/shared/feedback/ForumVerdict";
import { MAX_FORUM_VOTE_REASON, MIN_FORUM_VOTE_REASON } from "@aegis/shared/feedback/limits";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useEffect, useId, useMemo, useState } from "react";
import { Icons } from "@/design/icons";
import { Alert, Badge, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { ForumConversation } from "@/bugs/ForumConversation";
import { ForumResult } from "@/bugs/ForumResult";
import { ForumUpvoteButton } from "@/bugs/ForumUpvoteButton";
import { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { BugReportApiError } from "@/bugs/client";
import { forumApi, type ForumApi } from "@/bugs/forumClient";
import { FEEDBACK_STATUS_TONE } from "@/bugs/feedbackStatus";
import { getForumCopyPrefix } from "@/bugs/getForumCopyPrefix";
import { getForumError } from "@/bugs/getForumError";
import { readReplay } from "@/replays/files";
import { ReplayViewer } from "@/replays/ReplayViewer";
import "@/bugs/forum.css";

type ForumThreadParams = { board: ForumBoard; reportId: number; onBack: () => void };

export function ForumThread({ board, reportId, onBack }: ForumThreadParams) {
  const { t, locale } = useTranslation();
  const copy = getForumCopyPrefix(board);
  const api = useMemo(() => forumApi(board), [board]);
  const [detail, setDetail] = useState<ForumDetail>();
  const [failed, setFailed] = useState<"missing" | "error">();
  const [replay, setReplay] = useState<MatchReplay>();

  useEffect(() => {
    const controller = new AbortController();
    void api
      .read(reportId, controller.signal)
      .then(setDetail)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFailed(error instanceof BugReportApiError && error.status === 404 ? "missing" : "error");
      });
    return () => controller.abort();
  }, [api, reportId]);

  if (replay) return <ReplayViewer replay={replay} onClose={() => setReplay(undefined)} />;

  const back = (
    <Button variant="ghost" size="sm" className="forum-thread__back" icon={Icons.ArrowLeft} onClick={onBack}>
      {t(`${copy}.back`)}
    </Button>
  );

  if (failed) {
    return (
      <div className="forum-thread">
        {back}
        <Alert tone="warning" title={t(failed === "missing" ? `${copy}.missing` : "bugForum.failed")} />
      </div>
    );
  }
  if (!detail) return <p role="status">{t("common.loading")}</p>;

  return (
    <article className="forum-thread">
      {back}
      <div className="forum-thread__layout">
        <section className="forum-thread__report" aria-labelledby="forum-thread-title">
          <p className="forum-thread__meta">
            <span className="forum-row__meta">
              #{detail.id} · {new Date(detail.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
            </span>
            <Badge tone={FEEDBACK_STATUS_TONE[detail.status]}>{t(`feedback.status.${detail.status}`)}</Badge>
          </p>
          <h2 id="forum-thread-title">{detail.summary}</h2>
          <p className="forum-thread__description">{detail.description}</p>
          {detail.cardIds.length ? (
            <ul className="forum-cards" aria-label={t("bugReport.cardsLabel")}>
              {detail.cardIds.map((cardId) => (
                <li key={cardId}>{cardId}</li>
              ))}
            </ul>
          ) : null}
          {detail.hasReplay ? <ForumReplayButton api={api} reportId={detail.id} onOpen={setReplay} /> : null}
          {detail.teamReply ? (
            <section className="forum-team-reply" aria-labelledby="forum-team-reply-title">
              <h3 id="forum-team-reply-title">{t("bugForum.teamReply")}</h3>
              <p>{detail.teamReply}</p>
            </section>
          ) : null}
        </section>
        <aside className="forum-thread__aside">
          {board === ForumBoard.IDEAS.value ? (
            <section className="forum-vote" aria-labelledby="forum-upvote-title">
              <header className="forum-vote__header">
                <h3 id="forum-upvote-title">{t("ideaForum.upvoteTitle")}</h3>
                <p>{t("ideaForum.upvoteHint")}</p>
              </header>
              <ForumUpvoteButton api={api} item={detail} size="lg" onChange={setDetail} />
            </section>
          ) : detail.tally ? (
            <ForumResult api={api} board={board} detail={detail} tally={detail.tally} onChange={setDetail} />
          ) : (
            <ForumVotePanel api={api} detail={detail} onChange={setDetail} />
          )}
        </aside>
        <div className="forum-thread__discussion">
          <ForumConversation
            api={api}
            detail={detail}
            placeholder={t(`${copy}.commentPlaceholder`)}
            onChange={setDetail}
          />
        </div>
      </div>
    </article>
  );
}

function ForumReplayButton({
  api,
  reportId,
  onOpen,
}: {
  api: ForumApi;
  reportId: number;
  onOpen: (replay: MatchReplay) => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = async () => {
    setLoading(true);
    setFailed(false);
    try {
      onOpen(await readReplay(await api.replay(reportId)));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="forum-replay">
      <Button variant="secondary" size="sm" icon={Icons.PlayCircle} disabled={loading} onClick={() => void open()}>
        {loading ? t("bugForum.loadingReplay") : t("bugForum.watchReplay")}
      </Button>
      {failed ? <p className="forum-thread-muted">{t("bugForum.replayUnavailable")}</p> : null}
    </div>
  );
}

const VERDICT_ICON = { yes: Icons.Bug, no: Icons.CircleCheck } as const;

function ForumVotePanel({
  api,
  detail,
  onChange,
}: {
  api: ForumApi;
  detail: ForumDetail;
  onChange: (detail: ForumDetail) => void;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [verdict, setVerdict] = useState<ForumVerdict | undefined>(detail.myVote?.verdict);
  const [reason, setReason] = useState(detail.myVote?.reason ?? "");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();

  if (isClosedFeedbackStatus(detail.status)) return null;
  if (detail.ownReport) {
    return (
      <section className="forum-vote" data-locked>
        <h3>{t(`bugForum.voteTitle`)}</h3>
        <p className="forum-thread-muted">{t(`bugForum.ownReport`)}</p>
      </section>
    );
  }

  const ready = verdict !== undefined && reason.trim().length >= MIN_FORUM_VOTE_REASON;
  const unchanged = detail.myVote?.verdict === verdict && detail.myVote?.reason === reason.trim();

  const save = async (work: () => Promise<ForumDetail>) => {
    setSaving(true);
    setFailure(undefined);
    try {
      const next = await work();
      onChange(next);
      setVerdict(next.myVote?.verdict);
      setReason(next.myVote?.reason ?? "");
    } catch (error) {
      setFailure(getForumError(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="forum-vote" aria-labelledby={`${fieldId}-title`}>
      <header className="forum-vote__header">
        <h3 id={`${fieldId}-title`}>{t(`bugForum.voteTitle`)}</h3>
        <p>
          <Icons.Lock size={13} aria-hidden="true" /> {t("bugForum.voteHidden")}
        </p>
      </header>
      {detail.myVote ? (
        <p className="forum-vote__saved" role="status">
          <Icons.CircleCheck size={16} aria-hidden="true" />
          {t(`bugForum.youVoted.${detail.myVote.verdict}`)}
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !saving && verdict) void save(() => api.vote(detail.id, { verdict, reason }));
        }}
      >
        <div className="forum-vote__options" role="radiogroup" aria-labelledby={`${fieldId}-title`}>
          {FORUM_VERDICTS.map((option, index) => {
            const Icon = VERDICT_ICON[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={verdict === option}
                tabIndex={verdict === option || (verdict === undefined && index === 0) ? 0 : -1}
                className="forum-vote__option"
                data-verdict={option}
                onClick={() => setVerdict(option)}
                onKeyDown={(event) => {
                  const step = ["ArrowRight", "ArrowDown"].includes(event.key)
                    ? 1
                    : ["ArrowLeft", "ArrowUp"].includes(event.key)
                      ? -1
                      : 0;
                  if (step === 0) return;
                  event.preventDefault();
                  const target = (index + step + FORUM_VERDICTS.length) % FORUM_VERDICTS.length;
                  setVerdict(FORUM_VERDICTS[target]);
                  const radios =
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
                  radios?.[target]?.focus();
                }}
              >
                <span className="forum-vote__icon" aria-hidden="true">
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
          maxLength={MAX_FORUM_VOTE_REASON}
          placeholder={t(`bugForum.reasonPlaceholder`)}
          aria-describedby={`${fieldId}-hint`}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="forum-compose__footer">
          <small id={`${fieldId}-hint`}>
            {t("bugForum.reasonHint", { count: MIN_FORUM_VOTE_REASON })} · {reason.length} / {MAX_FORUM_VOTE_REASON}
          </small>
          <div className="forum-vote__actions">
            {detail.myVote ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => void save(() => api.retract(detail.id))}
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
