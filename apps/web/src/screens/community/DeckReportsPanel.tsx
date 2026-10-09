import type { CommunityDeckReport } from "@aegis/shared";
import { useEffect, useState } from "react";
import { relativeTime } from "../../bugs/feedbackStatus";
import { communityApi } from "../../community/client";
import { Alert, Button } from "../../design/primitives";
import { useTranslation } from "../../i18n";

/** A moderator's view of a deck's open reports, with a way to dismiss them when the deck is fine. */
export function DeckReportsPanel({ deckId }: { deckId: string }) {
  const { t, locale } = useTranslation();
  const [reports, setReports] = useState<CommunityDeckReport[]>();
  const [failed, setFailed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let current = true;
    communityApi
      .openReports(deckId)
      .then((loaded) => {
        if (current) setReports(loaded);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [deckId]);

  if (failed) return <Alert tone="warning">{t("community.reports.failed")}</Alert>;
  if (!reports?.length) return null;

  const dismiss = () => {
    setDismissing(true);
    communityApi
      .dismissReports(deckId)
      .then(() => setReports([]))
      .catch(() => setFailed(true))
      .finally(() => setDismissing(false));
  };

  return (
    <section className="community-reports" aria-labelledby="community-reports-title">
      <h2 id="community-reports-title">{t("community.reports.title", { count: reports.length })}</h2>
      <ul>
        {reports.map((report, index) => (
          <li key={index}>
            <strong>{t(`community.report.reason.${report.reason}`)}</strong>
            {report.details ? <p>{report.details}</p> : null}
            <small>
              {report.reporterName ?? t("community.reports.formerPlayer")} ·{" "}
              <time dateTime={new Date(report.createdAt).toISOString()}>{relativeTime(report.createdAt, locale)}</time>
            </small>
          </li>
        ))}
      </ul>
      <div className="community-reports__actions">
        <Button variant="secondary" size="sm" disabled={dismissing} onClick={dismiss}>
          {t("community.reports.dismiss")}
        </Button>
        <span>{t("community.reports.hint")}</span>
      </div>
    </section>
  );
}
