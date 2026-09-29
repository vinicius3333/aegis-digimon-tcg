/* The feedback modal: a bug, an improvement, or anything else, in the reporter's own words.
   Everything the client can know on its own — the build, the browser — is captured rather than
   asked, because a typed version number is a wrong version number. */

import { MatchLogId } from "../game/MatchLogId";
import { useId, useState } from "react";
import { Icons, type IconComponent } from "../design/icons";
import { Alert, Button, Dialog } from "../design/primitives";
import { useTranslation, type TranslationKey } from "../i18n";
import {
  bugReportApi,
  BugReportApiError,
  FEEDBACK_KINDS,
  MAX_BUG_REPORT_CARDS,
  MAX_BUG_REPORT_DESCRIPTION,
  MAX_BUG_REPORT_OPPONENT_DECK,
  MAX_BUG_REPORT_SUMMARY,
  type FeedbackKind,
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
  too_many_cards: "bugReport.error.tooManyCards",
  unknown_card: "bugReport.error.unknownCard",
  too_many_requests: "bugReport.error.tooManyRequests",
  reports_unavailable: "bugReport.error.unavailable",
  tracker_unavailable: "bugReport.error.unavailable",
};

const KIND_ICONS: Record<FeedbackKind, IconComponent> = {
  bug: Icons.Bug,
  improvement: Icons.Lightbulb,
  other: Icons.MessageSquare,
};

export function BugReportDialog({
  signedIn,
  onClose,
  matchLogId,
}: {
  signedIn: boolean;
  onClose: () => void;
  matchLogId?: string;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const kindName = useId();
  const summaryId = useId();
  const descriptionId = useId();
  const opponentDeckId = useId();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [summary, setSummary] = useState("");
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [opponentDeck, setOpponentDeck] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filed, setFiled] = useState<FiledBugReport>();
  const [error, setError] = useState<TranslationKey>();
  const isBug = kind === "bug";

  const submit = () => {
    setSubmitting(true);
    setError(undefined);
    void bugReportApi
      .submit({
        kind,
        summary,
        // Cards and the opponent's deck are bug fields; switching away hides them, so they are not sent.
        cardIds: isBug ? cardIds : [],
        description,
        ...(isBug && opponentDeck.trim() ? { opponentDeck } : {}),
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
      <header className="bug-report__head aegis-dialog__header">
        <span className="bug-report__title">
          <Icons.MessageSquare size={20} />
          <h2 id={titleId}>{t("bugReport.title")}</h2>
        </span>
        <p>{t(signedIn ? "bugReport.notice.signed" : "bugReport.notice.anonymous")}</p>
      </header>

      {matchLogId ? <MatchLogId id={matchLogId} /> : null}

      {filed ? (
        <Alert tone="success" title={t("bugReport.success")}>
          {t("bugReport.successDescription")}{" "}
          <a href={filed.url} target="_blank" rel="noreferrer noopener">
            {t("bugReport.successLink", { number: filed.number })}
          </a>
        </Alert>
      ) : (
        <>
          <fieldset className="bug-report__kinds">
            <legend className="aegis-sr-only">{t("bugReport.kindLabel")}</legend>
            {FEEDBACK_KINDS.map((option) => {
              const KindIcon = KIND_ICONS[option];
              return (
                <label key={option} className="bug-report__kind">
                  <input
                    type="radio"
                    name={kindName}
                    value={option}
                    checked={kind === option}
                    onChange={() => setKind(option)}
                  />
                  <KindIcon size={16} />
                  <span>{t(`bugReport.kind.${option}`)}</span>
                </label>
              );
            })}
          </fieldset>

          <div className="aegis-field">
            <label className="aegis-field__label" htmlFor={summaryId}>
              {t("bugReport.summaryLabel")}
            </label>
            <input
              id={summaryId}
              className="aegis-field__control"
              maxLength={MAX_BUG_REPORT_SUMMARY}
              value={summary}
              placeholder={t(`bugReport.summaryPlaceholder.${kind}`)}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          {isBug ? <CardAutocomplete selected={cardIds} onChange={setCardIds} limit={MAX_BUG_REPORT_CARDS} /> : null}

          <div className="aegis-field bug-report__description">
            <label className="aegis-field__label" htmlFor={descriptionId}>
              {t(`bugReport.descriptionLabel.${kind}`)}
            </label>
            <textarea
              id={descriptionId}
              className="aegis-field__control"
              rows={4}
              maxLength={MAX_BUG_REPORT_DESCRIPTION}
              value={description}
              placeholder={t(`bugReport.descriptionPlaceholder.${kind}`)}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="aegis-field__message">
              {t("bugReport.charactersLeft", { count: MAX_BUG_REPORT_DESCRIPTION - description.length })}
            </span>
          </div>

          {isBug ? (
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
          ) : null}

          {error ? <Alert tone="danger">{t(error)}</Alert> : null}
        </>
      )}

      <footer className="bug-report__actions">
        {filed ? null : (
          <Button onClick={submit} disabled={submitting || !summary.trim() || !description.trim()}>
            {t(submitting ? "bugReport.submitting" : "bugReport.submit")}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {t(filed ? "common.close" : "common.cancel")}
        </Button>
      </footer>
    </Dialog>
  );
}
