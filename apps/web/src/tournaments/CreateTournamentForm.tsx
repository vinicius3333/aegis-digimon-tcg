/* Tournament creation. The form disables what the selected preset forbids and previews what the
   server will freeze, but it never decides anything: every field is re-validated server-side and
   the reason codes that come back are rendered inline, against the field they blame. */

import { useId, useMemo, useState, type FormEvent } from "react";
import {
  swissRoundCount,
  topCutSize,
  type BanlistPolicy,
  type CreateTournamentInput,
  type TournamentStructure,
} from "@aegis/shared";
import { Alert, Badge, Button, Field, Panel, Switch } from "../design/primitives";
import { useTranslation } from "../i18n";
import { banlistCardName, banlistSetOptions, previewBanlist } from "./banlistPreview";
import { tournamentApi, type ApiError } from "./client";
import { reasonKey, restrictionKey, structureKey } from "./labels";
import { useServerClock } from "./hooks";
import { isServerClockSynced, serverNow } from "./serverClock";
import { DEFAULT_PRESET_ID, findPresetOption, TOURNAMENT_PRESETS, type BestOf } from "./presets";
import type { TournamentDetail, TournamentValidationError } from "./types";

type BanlistMode = BanlistPolicy["mode"];

const DEFAULT_LEAD_MS = 60 * 60_000;

/**
 * "Now" for this form. The server judges `startsAt` against ITS clock (`starts_at_in_past`) and
 * resolves a `current` banlist at ITS date, so both must be derived from server time once it is
 * known; until the first response has been observed there is nothing but the local clock.
 */
function formNow(): number {
  return isServerClockSynced() ? serverNow() : Date.now();
}

function defaultStartsAt(): string {
  return toLocalInputValue(formNow() + DEFAULT_LEAD_MS);
}

/** `datetime-local` wants wall-clock text, not an ISO instant, so the offset is subtracted. */
function toLocalInputValue(epochMs: number): string {
  const local = new Date(epochMs - new Date(epochMs).getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CreateTournamentForm({
  onCreated,
  onCancel,
}: {
  onCreated: (tournament: TournamentDetail) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [structure, setStructure] = useState<TournamentStructure>("single_elimination");
  const [bestOf, setBestOf] = useState<BestOf>(1);
  const [topCut, setTopCut] = useState(false);
  const [allowBots, setAllowBots] = useState(false);
  const [banlistMode, setBanlistMode] = useState<BanlistMode>("none");
  const [banlistSetId, setBanlistSetId] = useState(() => banlistSetOptions()[0] ?? "BT10");
  const [errors, setErrors] = useState<TournamentValidationError[]>([]);
  const [failure, setFailure] = useState<ApiError>();
  const [submitting, setSubmitting] = useState(false);

  const preset = findPresetOption(presetId);
  const showTopCut = structure === "swiss";
  const banlist = useMemo<BanlistPolicy>(
    () => (banlistMode === "as_of_set" ? { mode: "as_of_set", setId: banlistSetId } : { mode: banlistMode }),
    [banlistMode, banlistSetId],
  );
  // `current` resolves at the server's date, so the preview tracks the synced clock.
  const { offsetSeconds } = useServerClock();
  const preview = useMemo(() => previewBanlist(banlist, formNow()), [banlist, offsetSeconds]);
  const unrestrictedAllowed = preset?.supportsUnrestrictedBanlist ?? true;

  const selectPreset = (id: string) => {
    setPresetId(id);
    const next = findPresetOption(id);
    if (!next) return;
    if (!next.structures.includes(structure)) setStructure(next.structures[0] ?? "single_elimination");
    if (!next.bestOfOptions.includes(bestOf)) setBestOf(next.bestOfOptions[0] ?? 1);
    if (!next.supportsTopCut) setTopCut(false);
    if (!next.supportsBots) setAllowBots(false);
    if (!next.supportsUnrestrictedBanlist && banlistMode === "none") setBanlistMode("current");
  };

  const selectStructure = (next: TournamentStructure) => {
    setStructure(next);
    // Top Cut is meaningless in a bracket, so leaving Swiss retracts the choice instead of
    // silently submitting a flag the server would reject with `top_cut_requires_swiss`.
    if (next !== "swiss") setTopCut(false);
  };

  const errorFor = (field: string) => errors.find((error) => error.field === field);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setFailure(undefined);
    const input: CreateTournamentInput = {
      name: name.trim(),
      structure,
      topCut,
      bestOf,
      startsAt: new Date(startsAt).getTime(),
      maxPlayers,
      allowBots,
      rulesetPreset: presetId,
      banlist,
    };
    const result = await tournamentApi.create(input);
    setSubmitting(false);
    if (result.ok) {
      onCreated(result.value);
      return;
    }
    setErrors(result.error.reasons ?? []);
    if (!result.error.reasons?.length) setFailure(result.error);
  }

  return (
    <Panel className="tournaments-form">
      <h2>{t("tournaments.create.title")}</h2>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <Field
          label={t("tournaments.create.name")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={messageFor(errorFor("name"), t)}
        />
        <Field
          label={t("tournaments.create.startsAt")}
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          error={messageFor(errorFor("startsAt"), t)}
        />
        <Field
          label={t("tournaments.create.maxPlayers")}
          type="number"
          min={2}
          max={1024}
          value={maxPlayers}
          onChange={(event) => setMaxPlayers(Number(event.target.value))}
          error={messageFor(errorFor("maxPlayers"), t)}
        />

        <div className="aegis-field">
          <label className="aegis-field__label" htmlFor={`${formId}-preset`}>
            {t("tournaments.create.preset")}
          </label>
          <select
            id={`${formId}-preset`}
            className="aegis-field__control"
            value={presetId}
            onChange={(event) => selectPreset(event.target.value)}
          >
            {TOURNAMENT_PRESETS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
          {messageFor(errorFor("rulesetPreset"), t) ? (
            <span className="aegis-field__message" data-error>
              {messageFor(errorFor("rulesetPreset"), t)}
            </span>
          ) : null}
        </div>

        <div className="aegis-field">
          <label className="aegis-field__label" htmlFor={`${formId}-structure`}>
            {t("tournaments.create.structure")}
          </label>
          <select
            id={`${formId}-structure`}
            className="aegis-field__control"
            value={structure}
            onChange={(event) => selectStructure(event.target.value as TournamentStructure)}
          >
            {(["swiss", "single_elimination"] as const).map((option) => (
              <option key={option} value={option} disabled={preset ? !preset.structures.includes(option) : false}>
                {t(structureKey(option))}
              </option>
            ))}
          </select>
          {messageFor(errorFor("structure"), t) ? (
            <span className="aegis-field__message" data-error>
              {messageFor(errorFor("structure"), t)}
            </span>
          ) : null}
        </div>

        <div className="aegis-field">
          <label className="aegis-field__label" htmlFor={`${formId}-best-of`}>
            {t("tournaments.create.bestOf")}
          </label>
          <select
            id={`${formId}-best-of`}
            className="aegis-field__control"
            value={bestOf}
            onChange={(event) => setBestOf(Number(event.target.value) as BestOf)}
          >
            {([1, 3] as const).map((option) => (
              <option key={option} value={option} disabled={preset ? !preset.bestOfOptions.includes(option) : false}>
                {t("tournaments.bestOf", { count: option })}
              </option>
            ))}
          </select>
          {messageFor(errorFor("bestOf"), t) ? (
            <span className="aegis-field__message" data-error>
              {messageFor(errorFor("bestOf"), t)}
            </span>
          ) : null}
        </div>

        {showTopCut ? (
          <>
            <Switch
              checked={topCut}
              onChange={setTopCut}
              disabled={preset ? !preset.supportsTopCut : false}
              label={t("tournaments.create.topCut")}
              description={
                preset && !preset.supportsTopCut
                  ? t("tournaments.reason.topCutNotSupportedByPreset")
                  : t("tournaments.create.topCutDesc")
              }
            />
            {messageFor(errorFor("topCut"), t) ? (
              <span className="aegis-field__message" data-error>
                {messageFor(errorFor("topCut"), t)}
              </span>
            ) : null}
          </>
        ) : null}

        <Switch
          checked={allowBots}
          onChange={setAllowBots}
          disabled={preset ? !preset.supportsBots : false}
          label={t("tournaments.create.allowBots")}
          description={
            preset && !preset.supportsBots
              ? t("tournaments.reason.botsRequireCustomRuleset")
              : t("tournaments.create.allowBotsDesc")
          }
        />
        {messageFor(errorFor("allowBots"), t) ? (
          <span className="aegis-field__message" data-error>
            {messageFor(errorFor("allowBots"), t)}
          </span>
        ) : null}

        <div className="aegis-field">
          <label className="aegis-field__label" htmlFor={`${formId}-banlist`}>
            {t("tournaments.create.banlist")}
          </label>
          <select
            id={`${formId}-banlist`}
            className="aegis-field__control"
            value={banlistMode}
            onChange={(event) => setBanlistMode(event.target.value as BanlistMode)}
          >
            <option value="none" disabled={!unrestrictedAllowed}>
              {t("tournaments.banlist.none")}
            </option>
            <option value="current">{t("tournaments.banlist.current")}</option>
            <option value="as_of_set">{t("tournaments.banlist.asOfSetOption")}</option>
          </select>
          <span className="aegis-field__message">
            {unrestrictedAllowed
              ? t("tournaments.create.banlistNoneHint")
              : t("tournaments.create.banlistNoneDisabled")}
          </span>
          {messageFor(errorFor("banlist"), t) ? (
            <span className="aegis-field__message" data-error>
              {messageFor(errorFor("banlist"), t)}
            </span>
          ) : null}
        </div>

        {banlistMode === "as_of_set" ? (
          <div className="aegis-field">
            <label className="aegis-field__label" htmlFor={`${formId}-set`}>
              {t("tournaments.create.set")}
            </label>
            <select
              id={`${formId}-set`}
              className="aegis-field__control"
              value={banlistSetId}
              onChange={(event) => setBanlistSetId(event.target.value)}
            >
              {banlistSetOptions().map((setId) => (
                <option key={setId} value={setId}>
                  {setId}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <section className="tournaments-estimates" aria-label={t("tournaments.create.estimates")}>
          <h3>{t("tournaments.create.estimates")}</h3>
          {structure === "swiss" ? (
            <>
              <p>{t("tournaments.create.estimateRounds", { rounds: swissRoundCount(maxPlayers) })}</p>
              <p>
                {topCut
                  ? topCutSize(maxPlayers) > 0
                    ? t("tournaments.create.estimateCut", { size: topCutSize(maxPlayers) })
                    : t("tournaments.create.estimateCutZero")
                  : t("tournaments.create.estimateNoCut")}
              </p>
            </>
          ) : (
            <p>{t("tournaments.create.estimateBracket")}</p>
          )}
          <p className="tournaments-note">{t("tournaments.create.estimateNote")}</p>
        </section>

        <BanlistPreviewSection preview={preview} />

        {failure ? (
          <Alert tone="danger" title={t("tournaments.error.create")}>
            {describeFailure(failure, t)}
          </Alert>
        ) : null}
        {errors.length ? (
          <ul className="tournaments-reasons" aria-label={t("tournaments.error.create")}>
            {errors.map((error) => (
              <li key={`${error.field}:${error.code}`}>{messageFor(error, t)}</li>
            ))}
          </ul>
        ) : null}

        <div className="tournaments-form__actions">
          <Button type="submit" disabled={submitting}>
            {t("tournaments.create.submit")}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function BanlistPreviewSection({ preview }: { preview: ReturnType<typeof previewBanlist> }) {
  const { t } = useTranslation();
  return (
    <section className="tournaments-preview" aria-label={t("tournaments.create.preview")}>
      <h3>{t("tournaments.create.preview")}</h3>
      {preview.kind === "unrestricted" ? <p>{t("tournaments.create.previewNone")}</p> : null}
      {preview.kind === "unknown_set" ? <p>{t("tournaments.reason.banlistSetUnknown")}</p> : null}
      {preview.kind === "resolved" ? (
        <>
          <p>{t("tournaments.create.previewCount", { count: preview.cards.length, date: preview.asOf })}</p>
          <ul className="tournaments-banlist">
            {preview.cards.map((card) => (
              <li key={card.cardId}>
                <span className="tournaments-banlist__name">{banlistCardName(card.cardId)}</span>
                <span className="tournaments-banlist__id">{card.cardId}</span>
                <Badge tone={card.status === "banned" ? "danger" : "warning"}>{t(restrictionKey(card.status))}</Badge>
                <span className="tournaments-banlist__copies">
                  {t("tournaments.detail.copies", { count: card.allowedCopies })}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function messageFor(
  error: TournamentValidationError | undefined,
  t: ReturnType<typeof useTranslation>["t"],
): string | undefined {
  if (!error) return undefined;
  const key = reasonKey(error.code);
  return key ? t(key) : t("tournaments.reason.unknown", { code: error.code });
}

function describeFailure(failure: ApiError, t: ReturnType<typeof useTranslation>["t"]): string {
  const key = reasonKey(failure.code);
  return key ? t(key) : t("tournaments.reason.unknown", { code: failure.code });
}
