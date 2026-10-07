import { useId, useState } from "react";
import { COMMUNITY_REPORT_DETAILS_MAX, COMMUNITY_REPORT_REASONS, type CommunityReportReason } from "@aegis/shared";
import { AccountApiError } from "../../account/client";
import { communityApi } from "../../community/client";
import { Icons } from "../../design/icons";
import { Alert, Button, Dialog } from "../../design/primitives";
import { useTranslation, type TranslationKey } from "../../i18n";

const ERROR_KEYS: Partial<Record<number, TranslationKey>> = {
  404: "community.report.errorGone",
  429: "community.report.errorTooMany",
  503: "community.report.errorUnavailable",
};

export function ReportDeckDialog({
  deckId,
  deckName,
  onReported,
  onClose,
}: {
  deckId: string;
  deckName: string;
  onReported: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const reasonName = useId();
  const detailsId = useId();
  const [reason, setReason] = useState<CommunityReportReason>("offensive_name");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<TranslationKey>();

  const submit = () => {
    setSubmitting(true);
    setError(undefined);
    void communityApi
      .report(deckId, { reason, ...(details.trim() ? { details } : {}) })
      .then(onReported)
      .catch((failure: unknown) => {
        const known = failure instanceof AccountApiError ? ERROR_KEYS[failure.status] : undefined;
        setError(known ?? "community.report.errorGeneric");
        setSubmitting(false);
      });
  };

  return (
    <Dialog className="community-report" labelledBy={titleId} onClose={onClose}>
      <header className="aegis-dialog__header">
        <span className="community-report__title">
          <Icons.Flag size={20} />
          <h2 id={titleId}>{t("community.report.title", { name: deckName })}</h2>
        </span>
        <p>{t("community.report.body")}</p>
      </header>

      <fieldset className="community-report__reasons">
        <legend className="aegis-field__label">{t("community.report.reasonLabel")}</legend>
        {COMMUNITY_REPORT_REASONS.map((option) => (
          <label key={option} className="community-report__reason">
            <input
              type="radio"
              name={reasonName}
              value={option}
              checked={reason === option}
              onChange={() => setReason(option)}
            />
            <span>{t(`community.report.reason.${option}`)}</span>
          </label>
        ))}
      </fieldset>

      <div className="aegis-field">
        <label className="aegis-field__label" htmlFor={detailsId}>
          {t("community.report.detailsLabel")}
        </label>
        <textarea
          id={detailsId}
          className="aegis-field__control"
          rows={3}
          maxLength={COMMUNITY_REPORT_DETAILS_MAX}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        <span className="aegis-field__message">
          {details.length}/{COMMUNITY_REPORT_DETAILS_MAX}
        </span>
      </div>

      {error ? <Alert tone="danger">{t(error)}</Alert> : null}

      <footer className="community-report__actions">
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {t(submitting ? "community.report.sending" : "community.report.send")}
        </Button>
      </footer>
    </Dialog>
  );
}
