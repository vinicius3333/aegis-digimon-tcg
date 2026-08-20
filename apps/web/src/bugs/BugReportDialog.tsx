/* The bug-report modal: which cards misbehave, and what went wrong in the reporter's own words.
   Everything the client can know on its own — the build, the browser — is captured rather than
   asked, because a typed version number is a wrong version number. */

import { useId, useState } from "react";
import { Alert, Button, Dialog } from "../design/primitives";
import { useTranslation, type TranslationKey } from "../i18n";
import {
  bugReportApi,
  BugReportApiError,
  MAX_BUG_REPORT_CARDS,
  MAX_BUG_REPORT_DESCRIPTION,
  MAX_BUG_REPORT_OPPONENT_DECK,
  MAX_BUG_REPORT_SUMMARY,
  type FiledBugReport,
} from "./client";
import { CardAutocomplete } from "./CardAutocomplete";
import "./bugReports.css";

const ERROR_KEYS: Record<string, TranslationKey> = {
  empty_summary: "bugReport.error.emptySummary",
  summary_too_long: "bugReport.error.summaryTooLong",
  empty_description: "bugReport.error.emptyDescription",
  description_too_long: "bugReport.error.descriptionTooLong",
  opponent_deck_too_long: "bugReport.error.opponentDeckTooLong",
  invalid_attachment_url: "bugReport.error.invalidAttachment",
  too_many_cards: "bugReport.error.tooManyCards",
  unknown_card: "bugReport.error.unknownCard",
  too_many_requests: "bugReport.error.tooManyRequests",
  reports_unavailable: "bugReport.error.unavailable",
  tracker_unavailable: "bugReport.error.unavailable",
};

export function BugReportDialog({ signedIn, onClose }: { signedIn: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  const summaryId = useId();
  const descriptionId = useId();
  const opponentDeckId = useId();
  const attachmentId = useId();
  const [summary, setSummary] = useState("");
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [opponentDeck, setOpponentDeck] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filed, setFiled] = useState<FiledBugReport>();
  const [error, setError] = useState<TranslationKey>();

  const submit = () => {
    setSubmitting(true);
    setError(undefined);
    void bugReportApi
      .submit({
        summary,
        cardIds,
        description,
        ...(opponentDeck.trim() ? { opponentDeck } : {}),
        ...(attachmentUrl.trim() ? { attachmentUrl } : {}),
      })
      .then(setFiled)
      .catch((failure: unknown) => {
        const code = failure instanceof BugReportApiError ? failure.code : undefined;
        setError(code ? (ERROR_KEYS[code] ?? "bugReport.error.generic") : "bugReport.error.generic");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Dialog className="bug-report" labelledBy={titleId} onClose={onClose}>
      <header className="bug-report__head">
        <h2 id={titleId}>{t("bugReport.title")}</h2>
        <p>{t("bugReport.subtitle")}</p>
        <ul className="bug-report__rules">
          <li>{t("bugReport.rule.oneBug")}</li>
          <li>{t("bugReport.rule.english")}</li>
          <li>{t(signedIn ? "bugReport.rule.publicSigned" : "bugReport.rule.publicAnonymous")}</li>
        </ul>
      </header>

      {filed ? (
        <Alert tone="success" title={t("bugReport.success")}>
          {t("bugReport.successDescription")}{" "}
          <a href={filed.url} target="_blank" rel="noreferrer noopener">
            {t("bugReport.successLink", { number: filed.number })}
          </a>
        </Alert>
      ) : (
        <>
          <div className="aegis-field">
            <label className="aegis-field__label" htmlFor={summaryId}>
              {t("bugReport.summaryLabel")}
            </label>
            <input
              id={summaryId}
              className="aegis-field__control"
              maxLength={MAX_BUG_REPORT_SUMMARY}
              value={summary}
              placeholder={t("bugReport.summaryPlaceholder")}
              onChange={(event) => setSummary(event.target.value)}
            />
            <span className="aegis-field__message">{t("bugReport.summaryHint")}</span>
          </div>

          <CardAutocomplete selected={cardIds} onChange={setCardIds} limit={MAX_BUG_REPORT_CARDS} />

          <div className="aegis-field bug-report__description">
            <label className="aegis-field__label" htmlFor={descriptionId}>
              {t("bugReport.descriptionLabel")}
            </label>
            <textarea
              id={descriptionId}
              className="aegis-field__control"
              rows={8}
              maxLength={MAX_BUG_REPORT_DESCRIPTION}
              value={description}
              placeholder={t("bugReport.descriptionPlaceholder")}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="aegis-field__message">
              {t("bugReport.charactersLeft", { count: MAX_BUG_REPORT_DESCRIPTION - description.length })}
            </span>
          </div>

          <div className="aegis-field">
            <label className="aegis-field__label" htmlFor={opponentDeckId}>
              {t("bugReport.opponentDeckLabel")}
            </label>
            <input
              id={opponentDeckId}
              className="aegis-field__control"
              maxLength={MAX_BUG_REPORT_OPPONENT_DECK}
              value={opponentDeck}
              placeholder={t("bugReport.opponentDeckPlaceholder")}
              onChange={(event) => setOpponentDeck(event.target.value)}
            />
            <span className="aegis-field__message">{t("bugReport.opponentDeckHint")}</span>
          </div>

          <div className="aegis-field">
            <label className="aegis-field__label" htmlFor={attachmentId}>
              {t("bugReport.attachmentLabel")}
            </label>
            <input
              id={attachmentId}
              className="aegis-field__control"
              type="url"
              value={attachmentUrl}
              placeholder="https://discord.com/channels/…"
              onChange={(event) => setAttachmentUrl(event.target.value)}
            />
            <span className="aegis-field__message">{t("bugReport.attachmentHint")}</span>
          </div>

          {error ? <Alert tone="danger">{t(error)}</Alert> : null}
        </>
      )}

      <footer className="bug-report__actions">
        <Button variant="ghost" onClick={onClose}>
          {t(filed ? "common.close" : "common.cancel")}
        </Button>
        {filed ? null : (
          <Button onClick={submit} disabled={submitting || !summary.trim() || !description.trim()}>
            {t(submitting ? "bugReport.submitting" : "bugReport.submit")}
          </Button>
        )}
      </footer>
    </Dialog>
  );
}
