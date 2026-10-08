import { useEffect, useState } from "react";
import { Alert, Button } from "../design/primitives";
import { useTranslation } from "../i18n";
import { BugReportApiError } from "./client";
import { listFeedback, type FeedbackPage, type FeedbackRecord } from "./adminClient";
import "./feedbackScreen.css";

export function FeedbackScreen({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  return (
    <section className="feedback-page" aria-labelledby="feedback-title">
      <div className="feedback-column">
        <header>
          <h1 id="feedback-title">{t("feedback.title")}</h1>
          <p>{t("feedback.subtitle")}</p>
        </header>
        {isAdmin ? <FeedbackInbox /> : <Alert tone="warning" title={t("feedback.restricted")} />}
      </div>
    </section>
  );
}

function FeedbackInbox() {
  const { t } = useTranslation();
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState<FeedbackPage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"restricted" | "error">();
  const before = cursors.at(-1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPage(undefined);
    setError(undefined);
    void listFeedback(before, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPage(result);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(failure instanceof BugReportApiError && [401, 403].includes(failure.status) ? "restricted" : "error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [before, revision]);

  return (
    <>
      <div className="feedback-toolbar">
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => {
            setCursors([undefined]);
            setRevision((value) => value + 1);
          }}
        >
          {t("feedback.refresh")}
        </Button>
        <span>{t("feedback.page", { page: cursors.length })}</span>
      </div>
      {loading ? <p role="status">{t("common.loading")}</p> : null}
      {error ? <Alert tone="warning" title={t(`feedback.${error}`)} /> : null}
      {page?.items.length === 0 ? <p role="status">{t("feedback.empty")}</p> : null}
      {page?.items.length ? (
        <ul className="feedback-list">
          {page.items.map((item) => (
            <FeedbackItem key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
      <nav className="feedback-toolbar" aria-label={t("feedback.pagination")}>
        <Button
          variant="secondary"
          disabled={loading || cursors.length === 1}
          onClick={() => setCursors((values) => values.slice(0, -1))}
        >
          {t("feedback.newer")}
        </Button>
        <Button
          variant="secondary"
          disabled={loading || !page?.nextBefore}
          onClick={() => {
            if (page?.nextBefore) setCursors((values) => [...values, page.nextBefore!]);
          }}
        >
          {t("feedback.older")}
        </Button>
      </nav>
    </>
  );
}

function FeedbackItem({ item }: { item: FeedbackRecord }) {
  const { t, locale } = useTranslation();
  const { report } = item;
  const context = [
    [t("feedback.match"), report.matchId],
    [t("feedback.version"), report.publicVersion],
    [t("feedback.client"), report.clientRevision],
    [t("feedback.server"), report.serverRevision],
    [t("feedback.browser"), report.userAgent],
  ].filter((entry) => entry[1]);
  return (
    <li>
      <article className="feedback-item">
        <div className="feedback-item__meta">
          <span>
            #{item.id} · {t(`bugReport.kind.${report.kind}`)}
          </span>
          <time dateTime={new Date(item.createdAt).toISOString()}>
            {new Date(item.createdAt).toLocaleString(locale)}
          </time>
        </div>
        <h2>{report.summary}</h2>
        <p className="feedback-item__author">{report.reporterName ?? t("feedback.anonymous")}</p>
        <p className="feedback-item__description">{report.description}</p>
        {report.cardIds.length ? (
          <p>
            <strong>{t("bugReport.cardsLabel")}:</strong> {report.cardIds.join(", ")}
          </p>
        ) : null}
        {report.opponentDeck ? (
          <p>
            <strong>{t("bugReport.opponentDeckLabel")}:</strong> {report.opponentDeck}
          </p>
        ) : null}
        <details>
          <summary>{t("feedback.context")}</summary>
          <dl className="feedback-context">
            {context.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div>
              <dt>GitHub</dt>
              <dd>{t(`feedback.mirror.${item.githubStatus}`)}</dd>
            </div>
          </dl>
          {item.githubUrl ? (
            <a href={item.githubUrl} target="_blank" rel="noreferrer">
              {t("feedback.github", { number: item.githubNumber ?? "" })}
            </a>
          ) : null}
        </details>
      </article>
    </li>
  );
}
