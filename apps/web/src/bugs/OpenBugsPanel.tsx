import type { OpenBug } from "@aegis/shared/feedback/OpenBug";
import { useEffect, useState } from "react";
import { Alert, Badge, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { BugInvestigation } from "@/bugs/BugInvestigation";
import { FEEDBACK_STATUS_TONE } from "@/bugs/feedbackStatus";
import { openBugsApi } from "@/bugs/openBugsClient";
import "@/bugs/myFeedback.css";

type OpenBugsPanelParams = {
  signedIn: boolean;
  onSignIn: () => void;
};

export function OpenBugsPanel({ signedIn, onSignIn }: OpenBugsPanelParams) {
  const { t } = useTranslation();
  return (
    <div className="my-feedback-panel">
      <header className="my-feedback-header">
        <p>{t("openBugs.subtitle")}</p>
      </header>
      {signedIn ? (
        <OpenBugList />
      ) : (
        <Alert tone="info" title={t("openBugs.signInTitle")}>
          <p>{t("openBugs.signInCopy")}</p>
          <Button size="sm" onClick={onSignIn}>
            {t("nav.signIn")}
          </Button>
        </Alert>
      )}
    </div>
  );
}

function OpenBugList() {
  const { t } = useTranslation();
  const [items, setItems] = useState<OpenBug[]>();
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<number>();

  useEffect(() => {
    const controller = new AbortController();
    void openBugsApi
      .list(undefined, controller.signal)
      .then((page) => {
        setItems(page.items);
        setNextBefore(page.nextBefore);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const loadMore = async () => {
    if (nextBefore === null) return;
    setLoading(true);
    try {
      const page = await openBugsApi.list(nextBefore);
      setItems((current) => [...(current ?? []), ...page.items]);
      setNextBefore(page.nextBefore);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const replace = (bug: OpenBug) =>
    setItems((current) => current?.map((item) => (item.id === bug.id ? { ...item, ...bug } : item)));

  if (failed && !items?.length) return <Alert tone="warning" title={t("openBugs.failed")} />;
  if (!items) return <p role="status">{t("common.loading")}</p>;
  if (!items.length) return <p className="my-feedback-empty">{t("openBugs.empty")}</p>;

  return (
    <>
      <ul className="my-feedback-list">
        {items.map((bug) => (
          <li key={bug.id}>
            <OpenBugCard
              bug={bug}
              expanded={expanded === bug.id}
              onToggle={() => setExpanded((current) => (current === bug.id ? undefined : bug.id))}
              onChange={replace}
            />
          </li>
        ))}
      </ul>
      {nextBefore !== null ? (
        <Button variant="secondary" disabled={loading} onClick={() => void loadMore()}>
          {t("openBugs.more")}
        </Button>
      ) : null}
    </>
  );
}

type OpenBugCardParams = {
  bug: OpenBug;
  expanded: boolean;
  onToggle: () => void;
  onChange: (bug: OpenBug) => void;
};

function OpenBugCard({ bug, expanded, onToggle, onChange }: OpenBugCardParams) {
  const { t, locale } = useTranslation();
  const bodyId = `open-bug-${bug.id}`;
  return (
    <article className="my-feedback-card">
      <header className="my-feedback-card__header">
        <div className="my-feedback-card__title">
          <h2>{bug.summary}</h2>
          <p>
            <span className="my-feedback-card__id">#{bug.id}</span> ·{" "}
            {new Date(bug.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })} ·{" "}
            {bug.volunteerNames.length
              ? t("openBugs.volunteers", { names: bug.volunteerNames.join(", ") })
              : t("openBugs.noVolunteers")}{" "}
            · {t("openBugs.noteCount", { count: bug.noteCount })}
          </p>
        </div>
        <span className="my-feedback-card__badges">
          <Badge tone={FEEDBACK_STATUS_TONE[bug.status]}>{t(`feedback.status.${bug.status}`)}</Badge>
        </span>
        <button
          className="my-feedback-card__toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={t(expanded ? "myFeedback.collapse" : "myFeedback.expand", { summary: bug.summary })}
          onClick={onToggle}
        >
          <Icons.ChevronDown size={18} />
        </button>
      </header>
      {expanded ? (
        <div id={bodyId} className="my-feedback-card__body">
          <p className="my-feedback-card__description">{bug.description}</p>
          {bug.cardIds.length ? <p className="my-feedback-card__description">{bug.cardIds.join(", ")}</p> : null}
          <BugInvestigation bugId={bug.id} onChange={onChange} />
        </div>
      ) : null}
    </article>
  );
}
