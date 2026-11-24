import { MAX_BUG_VOLUNTEER_NOTE } from "@aegis/shared/feedback/limits";
import type { OpenBugDetail } from "@aegis/shared/feedback/OpenBug";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useEffect, useId, useState } from "react";
import { Alert, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { BugReportApiError } from "@/bugs/client";
import { openBugsApi } from "@/bugs/openBugsClient";
import "@/bugs/myFeedback.css";
import "@/bugs/openBugs.css";

type BugInvestigationParams = {
  bugId: number;
  onChange?: (bug: OpenBugDetail) => void;
};

export function BugInvestigation({ bugId, onChange }: BugInvestigationParams) {
  const { t, locale } = useTranslation();
  const fieldId = useId();
  const [bug, setBug] = useState<OpenBugDetail>();
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<"closed" | "generic">();

  useEffect(() => {
    const controller = new AbortController();
    void openBugsApi
      .read(bugId, controller.signal)
      .then(setBug)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [bugId]);

  if (failed) return <Alert tone="warning" title={t("openBugs.failed")} />;
  if (!bug) return <p role="status">{t("common.loading")}</p>;

  const closed = isClosedFeedbackStatus(bug.status);

  const save = async (work: () => Promise<OpenBugDetail>): Promise<boolean> => {
    setSaving(true);
    setFailure(undefined);
    try {
      const next = await work();
      setBug(next);
      onChange?.(next);
      return true;
    } catch (error) {
      setFailure(error instanceof BugReportApiError && error.code === "closed" ? "closed" : "generic");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="open-bug-investigation" aria-labelledby={`${fieldId}-title`}>
      <h3 id={`${fieldId}-title`}>{t("openBugs.notesTitle")}</h3>
      <p className="open-bug-investigation__volunteers">
        {bug.volunteerNames.length
          ? t("openBugs.volunteers", { names: bug.volunteerNames.join(", ") })
          : t("openBugs.noVolunteers")}
      </p>
      {closed ? null : (
        <Button
          variant="secondary"
          size="sm"
          icon={bug.claimedByMe ? Icons.X : Icons.Search}
          disabled={saving}
          onClick={() => void save(() => (bug.claimedByMe ? openBugsApi.release(bugId) : openBugsApi.claim(bugId)))}
        >
          {t(bug.claimedByMe ? "openBugs.release" : "openBugs.claim")}
        </Button>
      )}
      {bug.notes.length ? (
        <ol className="open-bug-notes">
          {bug.notes.map((entry) => (
            <li key={entry.id}>
              <p className="open-bug-notes__meta">
                <strong>{entry.authorName ?? t("openBugs.formerPlayer")}</strong> ·{" "}
                <time dateTime={new Date(entry.createdAt).toISOString()}>
                  {new Date(entry.createdAt).toLocaleString(locale)}
                </time>
              </p>
              <p className="open-bug-notes__body">{entry.body}</p>
            </li>
          ))}
        </ol>
      ) : null}
      {closed ? null : (
        <form
          className="my-feedback-reopen my-feedback-reopen--open"
          onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim() || saving) return;
            void save(() => openBugsApi.addNote(bugId, note)).then((saved) => {
              if (saved) setNote("");
            });
          }}
        >
          <label htmlFor={fieldId}>{t("openBugs.noteLabel")}</label>
          <textarea
            id={fieldId}
            rows={3}
            value={note}
            maxLength={MAX_BUG_VOLUNTEER_NOTE}
            placeholder={t("openBugs.notePlaceholder")}
            aria-describedby={`${fieldId}-hint`}
            onChange={(event) => setNote(event.target.value)}
          />
          <p id={`${fieldId}-hint`}>{t("openBugs.noteHint")}</p>
          <small>
            {note.length} / {MAX_BUG_VOLUNTEER_NOTE}
          </small>
          <div className="my-feedback-reopen__actions">
            <Button type="submit" disabled={!note.trim() || saving}>
              {t("openBugs.noteSubmit")}
            </Button>
          </div>
        </form>
      )}
      {failure ? (
        <Alert tone="danger" title={t(failure === "closed" ? "openBugs.closed" : "openBugs.saveFailed")} />
      ) : null}
    </section>
  );
}
