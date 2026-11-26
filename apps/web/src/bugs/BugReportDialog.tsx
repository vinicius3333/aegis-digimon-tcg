import { useEffect, useId, useState } from "react";
import { accountApi } from "../account/client";
import { Icons, type IconComponent } from "../design/icons";
import { Alert, Button, Dialog } from "../design/primitives";
import { useTranslation, type TranslationKey } from "../i18n";
import { replayBlob } from "@/replays/files";
import { localReplayFile, localReplaysByMatch, type LocalReplay } from "@/replays/local";
import {
  bugReportApi,
  BugReportApiError,
  MAX_BUG_REPORT_DESCRIPTION,
  MAX_BUG_REPORT_SUMMARY,
  OFFERED_FEEDBACK_KINDS,
  type FiledBugReport,
  type OfferedFeedbackKind,
} from "./client";
import "./bugReports.css";

const ERROR_KEYS: Record<string, TranslationKey> = {
  empty_summary: "bugReport.error.emptySummary",
  summary_too_long: "bugReport.error.summaryTooLong",
  empty_description: "bugReport.error.emptyDescription",
  description_too_long: "bugReport.error.descriptionTooLong",
  too_many_requests: "bugReport.error.tooManyRequests",
  reports_unavailable: "bugReport.error.unavailable",
  tracker_unavailable: "bugReport.error.unavailable",
};

const SAVED_MATCH_CHOICES = 20;

function opponentName(replay: LocalReplay): string {
  return replay.summary.players[replay.viewerSeat === 1 ? 0 : 1];
}

const KIND_ICONS: Record<OfferedFeedbackKind, IconComponent> = {
  bug: Icons.Bug,
  improvement: Icons.Lightbulb,
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
  const { t, locale } = useTranslation();
  const titleId = useId();
  const kindName = useId();
  const summaryId = useId();
  const descriptionId = useId();
  const [kind, setKind] = useState<OfferedFeedbackKind>("bug");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filed, setFiled] = useState<FiledBugReport>();
  const [error, setError] = useState<TranslationKey>();
  // Until the server says otherwise, assume the public copy is on: never understate where words go.
  const [publicMirror, setPublicMirror] = useState(true);
  const playtestId = useId();
  const [playtestMember, setPlaytestMember] = useState<boolean>();
  const [playtestWanted, setPlaytestWanted] = useState(false);
  const [playtestSaveFailed, setPlaytestSaveFailed] = useState(false);
  const savedMatchId = useId();
  const [savedMatches, setSavedMatches] = useState<LocalReplay[]>([]);
  const [savedMatchKey, setSavedMatchKey] = useState("");
  const [replayAttachFailed, setReplayAttachFailed] = useState(false);
  const hasDraft = [summary, description].some((text) => text.trim());

  useEffect(() => {
    if (!signedIn || matchLogId) return;
    let cancelled = false;
    void localReplaysByMatch().then((replays) => {
      if (cancelled) return;
      setSavedMatches(
        [...replays.values()]
          .sort((first, second) => second.summary.finishedAt - first.summary.finishedAt)
          .slice(0, SAVED_MATCH_CHOICES),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, matchLogId]);

  useEffect(() => {
    const controller = new AbortController();
    void bugReportApi
      .publicMirror(controller.signal)
      .then(setPublicMirror)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void accountApi
      .playtest()
      .then(({ member }) => {
        if (cancelled) return;
        setPlaytestMember(member);
        setPlaytestWanted(member);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const submit = () => {
    setSubmitting(true);
    setError(undefined);
    void bugReportApi
      .submit({
        kind,
        summary,
        cardIds: [],
        description,
        ...(matchLogId ? { matchId: matchLogId } : {}),
      })
      .then((report) => {
        setFiled(report);
        const savedMatch = savedMatches.find((replay) => replay.key === savedMatchKey);
        return Promise.all([
          savedMatch && report.reportId !== undefined
            ? bugReportApi
                .attachReplayFile(report.reportId, replayBlob(localReplayFile(savedMatch)))
                .catch(() => setReplayAttachFailed(true))
            : undefined,
          signedIn && playtestMember !== undefined && playtestWanted !== playtestMember
            ? accountApi
                .setPlaytest(playtestWanted)
                .then(({ member }) => setPlaytestMember(member))
                .catch(() => setPlaytestSaveFailed(true))
            : undefined,
        ]);
      })
      .catch((failure: unknown) => {
        const code = failure instanceof BugReportApiError ? failure.code : undefined;
        setError(code ? (ERROR_KEYS[code] ?? "bugReport.error.generic") : "bugReport.error.generic");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    // Only Cancel closes a started report: a click outside or a stray Escape must not
    // throw away what the reporter typed. Escape still closes an empty or sent form.
    <Dialog
      className="bug-report"
      labelledBy={titleId}
      onClose={onClose}
      closeOnBackdrop={false}
      closeOnEscape={!!filed || !hasDraft}
    >
      <header className="bug-report__head aegis-dialog__header">
        <span className="bug-report__title">
          <Icons.Megaphone size={20} />
          <h2 id={titleId}>{t("bugReport.title")}</h2>
        </span>
        <p>
          {t(
            publicMirror && kind === "bug"
              ? signedIn
                ? "bugReport.notice.signed"
                : "bugReport.notice.anonymous"
              : signedIn
                ? "bugReport.notice.signedPrivate"
                : "bugReport.notice.anonymousPrivate",
          )}
        </p>
      </header>

      {filed ? (
        <>
          <Alert tone="success" title={t("bugReport.success")}>
            {t(signedIn ? "bugReport.successTracked" : "bugReport.successDescription")}
          </Alert>
          {playtestSaveFailed ? (
            <p className="aegis-field__message" role="status">
              {t("bugReport.playtest.saveFailed")}
            </p>
          ) : null}
          {replayAttachFailed ? (
            <p className="aegis-field__message" role="status">
              {t("bugReport.replay.attachFailed")}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <fieldset className="bug-report__kinds">
            <legend className="aegis-sr-only">{t("bugReport.kindLabel")}</legend>
            {OFFERED_FEEDBACK_KINDS.map((option) => {
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
              {t(`bugReport.summaryLabel.${kind}`)}
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

          {savedMatches.length ? (
            <div className="aegis-field">
              <label className="aegis-field__label" htmlFor={savedMatchId}>
                {t("bugReport.replay.label")}
              </label>
              <select
                id={savedMatchId}
                className="aegis-field__control"
                aria-describedby={`${savedMatchId}-hint`}
                value={savedMatchKey}
                onChange={(event) => setSavedMatchKey(event.target.value)}
              >
                <option value="">{t("bugReport.replay.none")}</option>
                {savedMatches.map((replay) => (
                  <option key={replay.key} value={replay.key}>
                    {t("bugReport.replay.option", {
                      opponent: opponentName(replay),
                      date: new Date(replay.summary.finishedAt).toLocaleString(locale),
                    })}
                  </option>
                ))}
              </select>
              <span id={`${savedMatchId}-hint`} className="aegis-field__message">
                {t("bugReport.replay.hint")}
              </span>
            </div>
          ) : null}

          {signedIn && playtestMember !== undefined ? (
            <label className="bug-report__playtest" htmlFor={playtestId}>
              <input
                id={playtestId}
                aria-labelledby={`${playtestId}-label`}
                aria-describedby={`${playtestId}-hint`}
                type="checkbox"
                checked={playtestWanted}
                onChange={(event) => setPlaytestWanted(event.target.checked)}
              />
              <span>
                <strong id={`${playtestId}-label`}>{t("bugReport.playtest.join")}</strong>
                <span id={`${playtestId}-hint`} className="aegis-field__message">
                  {t("bugReport.playtest.hint")}
                </span>
              </span>
            </label>
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
