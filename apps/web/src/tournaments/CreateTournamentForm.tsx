import { TournamentCategory } from "@aegis/shared/tournaments/TournamentCategory";
import type { DeckFormat } from "@aegis/shared/deckFormat";
import { DeckFormatSelector } from "@/screens/DeckFormatSelector";
import type { TournamentClockSettings } from "@aegis/shared/tournaments/TournamentClockSettings";
import { TournamentClockFields } from "@/tournaments/TournamentClockFields";
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  swissRoundCount,
  topCutSize,
  type BanlistPolicy,
  type CreateTournamentInput,
  type TournamentStructure,
} from "@aegis/shared";
import { Alert, Badge, Button, Field, Panel, Switch } from "../design/primitives";
import { useTranslation } from "../i18n";
import { banlistSetOptions, previewBanlist } from "./banlistPreview";
import { useTranslatedCardName } from "@/i18n/useTranslatedCardName";
import { tournamentApi, type ApiError } from "./client";
import { reasonKey, restrictionKey, structureKey } from "./labels";
import { useServerClock } from "./hooks";
import "@/tournaments/createTournamentForm.css";
import { isServerClockSynced, serverNow } from "./serverClock";
import type { TournamentDetail, TournamentValidationError } from "./types";

type BanlistMode = BanlistPolicy["mode"];

const DEFAULT_LEAD_MS = 60 * 60_000;

function formNow(): number {
  return isServerClockSynced() ? serverNow() : Date.now();
}

function defaultStartsAt(): string {
  return toLocalInputValue(formNow() + DEFAULT_LEAD_MS);
}

function toLocalInputValue(epochMs: number): string {
  const local = new Date(epochMs - new Date(epochMs).getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CreateTournamentForm({
  onCreated,
  onCancel,
  canCreateOfficial = false,
}: {
  onCreated: (tournament: TournamentDetail) => void;
  onCancel: () => void;
  canCreateOfficial?: boolean;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const [official, setOfficial] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<DeckFormat>("standard");
  const [password, setPassword] = useState("");
  const [clocks, setClocks] = useState<TournamentClockSettings>();
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [structure, setStructure] = useState<TournamentStructure>("single_elimination");
  const [bestOf, setBestOf] = useState<1 | 3>(1);
  const [topCut, setTopCut] = useState(false);
  const [allowBots, setAllowBots] = useState(false);
  const [randomBotStyles, setRandomBotStyles] = useState(false);
  const [banlistMode, setBanlistMode] = useState<BanlistMode>("none");
  const [banlistSetId, setBanlistSetId] = useState(() => banlistSetOptions()[0] ?? "BT10");
  const [errors, setErrors] = useState<TournamentValidationError[]>([]);
  const [failure, setFailure] = useState<ApiError>();
  const [submitting, setSubmitting] = useState(false);

  const isOfficial = canCreateOfficial && official;
  const showTopCut = structure === "swiss";
  const banlist = useMemo<BanlistPolicy>(
    () => (banlistMode === "as_of_set" ? { mode: "as_of_set", setId: banlistSetId } : { mode: banlistMode }),
    [banlistMode, banlistSetId],
  );
  const { offsetSeconds } = useServerClock();
  const preview = useMemo(() => previewBanlist(banlist, formNow()), [banlist, offsetSeconds]);

  const selectStructure = (next: TournamentStructure) => {
    setStructure(next);
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
      category: isOfficial ? TournamentCategory.OFFICIAL.value : TournamentCategory.COMMUNITY.value,
      description: description.trim(),
      password,
      format,
      clocks,
      structure,
      topCut,
      bestOf,
      startsAt: new Date(startsAt).getTime(),
      maxPlayers,
      allowBots,
      randomBotStyles: allowBots && randomBotStyles,
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
    <form className="create-tournament" onSubmit={(event) => void submit(event)} noValidate>
      <header className="create-tournament__head">
        <h2>{t("tournaments.create.title")}</h2>
        {canCreateOfficial ? null : <p className="tournaments-note">{t("tournaments.category.communityHelp")}</p>}
      </header>

      <div className="create-tournament__layout">
        <div className="create-tournament__sections">
          <CreateFormSection title={t("tournaments.create.section.basics")}>
            <Field
              className="create-tournament__wide"
              label={t("tournaments.create.name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={messageFor(errorFor("name"), t)}
            />
            <div className="aegis-field">
              <label className="aegis-field__label" htmlFor={`${formId}-description`}>
                {t("tournaments.create.description")}
              </label>
              <textarea
                id={`${formId}-description`}
                className="aegis-field__control"
                value={description}
                maxLength={1000}
                rows={3}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <Field
              label={t("tournaments.create.password")}
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={messageFor(errorFor("password"), t)}
            />
          </CreateFormSection>

          <CreateFormSection title={t("tournaments.create.section.schedule")}>
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
          </CreateFormSection>

          <CreateFormSection title={t("tournaments.create.section.format")}>
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
                  <option key={option} value={option}>
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
                onChange={(event) => setBestOf(Number(event.target.value) as 1 | 3)}
              >
                {([1, 3] as const).map((option) => (
                  <option key={option} value={option}>
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
              <div className="create-tournament__toggle">
                <Switch
                  checked={topCut}
                  onChange={setTopCut}
                  label={t("tournaments.create.topCut")}
                  description={t("tournaments.create.topCutDesc")}
                />
                {messageFor(errorFor("topCut"), t) ? (
                  <span className="aegis-field__message" data-error>
                    {messageFor(errorFor("topCut"), t)}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="create-tournament__wide">
              <DeckFormatSelector value={format} onChange={setFormat} showBanlist={false} />
            </div>

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
                <option value="none">{t("tournaments.banlist.none")}</option>
                <option value="current">{t("tournaments.banlist.current")}</option>
                <option value="as_of_set">{t("tournaments.banlist.asOfSetOption")}</option>
              </select>
              <span className="aegis-field__message">{t("tournaments.create.banlistNoneHint")}</span>
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

            <div className="create-tournament__wide">
              <TournamentClockFields value={clocks} onChange={setClocks} />
            </div>
          </CreateFormSection>

          <CreateFormSection title={t("tournaments.create.section.bots")}>
            <div className="create-tournament__toggle">
              <Switch
                checked={allowBots}
                onChange={setAllowBots}
                label={t("tournaments.create.allowBots")}
                description={t("tournaments.create.allowBotsDesc")}
              />
              {messageFor(errorFor("allowBots"), t) ? (
                <span className="aegis-field__message" data-error>
                  {messageFor(errorFor("allowBots"), t)}
                </span>
              ) : null}
            </div>
            {allowBots ? (
              <div className="create-tournament__toggle">
                <Switch
                  checked={randomBotStyles}
                  onChange={setRandomBotStyles}
                  label={t("tournaments.create.randomBotStyles")}
                  description={t("tournaments.create.randomBotStylesDesc")}
                />
              </div>
            ) : null}
          </CreateFormSection>

          {canCreateOfficial ? (
            <CreateFormSection title={t("tournaments.create.section.admin")}>
              <div className="create-tournament__toggle create-tournament__wide">
                <Switch
                  checked={official}
                  onChange={setOfficial}
                  label={t("tournaments.category.official")}
                  description={t("tournaments.category.help")}
                />
              </div>
            </CreateFormSection>
          ) : null}
        </div>

        <aside className="create-tournament__summary">
          <Panel pad={24} className="create-tournament__summary-panel">
            <h3 className="create-tournament__summary-title">{t("tournaments.create.summary")}</h3>
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

            <div className="create-tournament__actions">
              <Button type="submit" disabled={submitting} full>
                {t("tournaments.create.submit")}
              </Button>
              <Button type="button" variant="secondary" onClick={onCancel} full>
                {t("common.cancel")}
              </Button>
            </div>
          </Panel>
        </aside>
      </div>
    </form>
  );
}

function CreateFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel pad={24} className="create-tournament__section">
      <h3 className="create-tournament__section-title">{title}</h3>
      <div className="create-tournament__grid">{children}</div>
    </Panel>
  );
}

function BanlistPreviewSection({ preview }: { preview: ReturnType<typeof previewBanlist> }) {
  const getCardName = useTranslatedCardName();
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
                <span className="tournaments-banlist__name">{getCardName(card.cardId)}</span>
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
