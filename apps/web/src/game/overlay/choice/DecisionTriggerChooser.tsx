import { useState } from "react";
import { parseTriggerKey, type DecisionResponse } from "@aegis/shared";
import { EffectText } from "../../EffectText";
import { CardFull } from "../../../design/cards";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { triggerCardId, triggerLabels } from "../../boardModel";
import {
  cardEffectClauseForTiming,
  cardEffectClausesForTiming,
  playerFacingEffectClause,
  printedTimingLabel,
} from "../effectText";
import type { TriggerDetail } from "../types";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

/** Preset answer for an effect's yes/no questions; absent means the engine asks. */
type Preset = "yes" | "no";

/**
 * The chooser for an `orderTriggers` decision. A plain prompt picks the one effect that fires
 * next. A prompt that accepts a resolution plan lets the player click effects in resolution
 * order, like Assembly materials, and preset each effect's yes/no questions.
 */
export function DecisionTriggerChooser({
  triggerKeys,
  triggerCardIds,
  triggerDetails,
  wideDialog,
  timing,
  triggerTimings,
  triggerDescriptions,
  triggerIsInherited,
  triggerIsOptional,
  acceptsResolutionPlan,
  onRespond,
  onOpenBoard,
}: {
  triggerKeys: readonly string[];
  triggerCardIds: readonly string[];
  /** Aligned to `triggerKeys`; empty means the chooser shows names only. */
  triggerDetails: readonly TriggerDetail[];
  wideDialog: boolean;
  timing: string | undefined;
  triggerTimings: readonly string[] | undefined;
  triggerDescriptions: readonly string[] | undefined;
  triggerIsInherited: readonly boolean[] | undefined;
  triggerIsOptional: readonly boolean[] | undefined;
  acceptsResolutionPlan: boolean;
  onRespond: (response: DecisionResponse) => void;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<string[]>([]);
  const [presets, setPresets] = useState<Readonly<Record<string, Preset>>>({});
  const triggerKeyLabels = triggerLabels(triggerKeys, t, triggerCardIds);
  // Two effects of ONE permanent reach the chooser with the same name and art; the
  // window each fired in is the only honest thing that separates them.
  const triggerTimingLabels = triggerKeys.map((_key, index) =>
    printedTimingLabel(triggerTimings?.[index] || timing || undefined),
  );
  const commonTriggerTiming =
    triggerTimingLabels.length > 0 && triggerTimingLabels.every((label) => label === triggerTimingLabels[0])
      ? triggerTimingLabels[0]
      : undefined;
  const entryClauses = distinctTriggerClauses(
    triggerKeys.map((key, index) => {
      const cardId = triggerCardIds[index] ?? triggerCardId(key);
      const entryTiming = triggerTimings?.[index] || timing || undefined;
      const isInherited = triggerIsInherited?.[index];
      return {
        cardId,
        timing: entryTiming,
        isInherited,
        clause:
          playerFacingEffectClause({
            cardId,
            timing: entryTiming,
            description: triggerDescriptions?.[index],
            isInherited,
          }) ?? cardEffectClauseForTiming(cardId, entryTiming, isInherited),
      };
    }),
  );

  const visibleIndexes = onceActivatableIndexes(triggerKeys, entryClauses);
  const optionCount = visibleIndexes.length;
  const visibleKeys = visibleIndexes.map((index) => triggerKeys[index]!);
  const optionalKeys = acceptsResolutionPlan
    ? visibleIndexes.filter((index) => triggerIsOptional?.[index] === true).map((index) => triggerKeys[index]!)
    : [];

  const toggle = (key: string) => {
    if (!acceptsResolutionPlan) {
      setOrder((current) => (current[0] === key ? [] : [key]));
      return;
    }
    setOrder((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]));
  };
  const orderRemaining = () =>
    setOrder((current) => [...current, ...visibleKeys.filter((key) => !current.includes(key))]);
  const setPreset = (key: string, preset: Preset | undefined) =>
    setPresets((current) => {
      const { [key]: _previous, ...rest } = current;
      return preset === undefined ? rest : { ...rest, [key]: preset };
    });
  const presetAll = (preset: Preset) => setPresets(Object.fromEntries(optionalKeys.map((key) => [key, preset])));

  const canResolve = acceptsResolutionPlan ? order.length > 0 : order.length === 1;
  const respond = () => {
    const optionalAnswers = Object.fromEntries(Object.entries(presets).map(([key, preset]) => [key, preset === "yes"]));
    onRespond(
      acceptsResolutionPlan && Object.keys(optionalAnswers).length > 0
        ? { kind: "orderTriggers", order: [...order], optionalAnswers }
        : { kind: "orderTriggers", order: [...order] },
    );
  };
  const resolveLabel =
    optionCount === 1
      ? t("overlay.resolveEffect")
      : order.length > 1
        ? t("overlay.resolveInOrder")
        : t("overlay.resolveNextEffect");

  return (
    <div className="trigger-chooser__layout">
      {acceptsResolutionPlan && optionCount > 1 ? null : (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ds-fg-muted)",
            marginBottom: 10,
          }}
        >
          {t(optionCount === 1 ? "overlay.confirmPendingEffect" : "overlay.chooseNextEffect")}
        </div>
      )}
      {commonTriggerTiming || optionalKeys.length > 0 ? (
        <div className="trigger-chooser__toolbar">
          <div className="trigger-chooser__intro">
            {commonTriggerTiming ? <span className="trigger-chooser__context">{commonTriggerTiming}</span> : null}
            {acceptsResolutionPlan && optionCount > 1 ? (
              <span className="trigger-chooser__hint">{t("overlay.orderNextEffects")}</span>
            ) : null}
          </div>
          {optionalKeys.length > 0 ? (
            <div className="trigger-chooser__bulk" role="group">
              <Button size="sm" variant="secondary" onClick={() => presetAll("yes")}>
                {t("overlay.presetYesAll")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => presetAll("no")}>
                {t("overlay.presetNoAll")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={order.length === 0 && Object.keys(presets).length === 0}
                onClick={() => {
                  setOrder([]);
                  setPresets({});
                }}
              >
                {t("overlay.presetReset")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={`trigger-chooser${acceptsResolutionPlan ? " trigger-chooser--plan" : ""}`}>
        {visibleIndexes.map((i) => {
          const key = triggerKeys[i]!;
          const position = order.indexOf(key);
          const chosen = position >= 0;
          const isOptional = optionalKeys.includes(key);
          const cardId = triggerCardIds[i] ?? triggerCardId(key);
          const detail = triggerDetails[i];
          const timingLabel = triggerTimingLabels[i];
          const activeClause = entryClauses[i];
          return (
            <div key={key} className={`trigger-chooser__entry${chosen ? " trigger-chooser__entry--chosen" : ""}`}>
              <button
                type="button"
                className={`trigger-chooser__option${chosen ? " trigger-chooser__option--chosen" : ""}`}
                aria-label={[timingLabel, triggerKeyLabels[i], detail?.sourceLabel].filter(Boolean).join(", ")}
                aria-pressed={chosen}
                onClick={() => toggle(key)}
              >
                <span className="trigger-chooser__heading">
                  <span className="trigger-chooser__card">
                    <CardFull
                      cardId={cardId}
                      width={acceptsResolutionPlan ? 64 : wideDialog ? 96 : 72}
                      zoomOnHover={false}
                    />
                    {acceptsResolutionPlan && chosen ? (
                      <span className="decision-overlay__order-badge" aria-hidden="true">
                        {position + 1}
                      </span>
                    ) : null}
                  </span>
                  <span className="trigger-chooser__meta">
                    <span className="trigger-chooser__name">{triggerKeyLabels[i]}</span>
                    <span className="trigger-chooser__id">{cardId}</span>
                    {detail?.sourceLabel ? <span className="trigger-chooser__source">{detail.sourceLabel}</span> : null}
                  </span>
                  {chosen && !acceptsResolutionPlan ? (
                    <span className="trigger-chooser__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </span>
                {activeClause ? (
                  <span className="trigger-chooser__section">
                    <span className="trigger-chooser__effect-text">
                      <EffectText text={activeClause} />
                    </span>
                  </span>
                ) : null}
              </button>
              {acceptsResolutionPlan ? (
                isOptional ? (
                  <PresetControl
                    label={t("overlay.presetLabel", { name: triggerKeyLabels[i] ?? cardId })}
                    value={presets[key]}
                    onChange={(preset) => setPreset(key, preset)}
                  />
                ) : (
                  <span className="trigger-chooser__mandatory">{t("overlay.presetMandatory")}</span>
                )
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="trigger-chooser__footer">
        <DecisionViewBoardButton onOpenBoard={onOpenBoard} />
        {acceptsResolutionPlan && optionCount > 1 ? (
          <div className="trigger-chooser__status" aria-live="polite">
            <span>{t("overlay.orderedCount", { ordered: order.length, total: optionCount })}</span>
            {order.length > 0 && order.length < optionCount ? (
              <>
                <span className="trigger-chooser__status-hint">{t("overlay.orderedRestLater")}</span>
                <button type="button" className="trigger-chooser__link" onClick={orderRemaining}>
                  {t("overlay.orderRemaining")}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        <Button size="lg" icon={Icons.Check} disabled={!canResolve} onClick={respond}>
          {resolveLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Two effects of one card under one timing (EX13-036 prints [When Digivolving] twice)
 * both resolve to the FIRST printed clause when the engine sends no description for them.
 * Hand the n-th such entry the n-th printed clause instead, so the chooser never shows the
 * same words twice for two different effects. Entries that already differ are untouched.
 */
function distinctTriggerClauses(
  entries: readonly { cardId: string; timing: string | undefined; isInherited?: boolean; clause: string | undefined }[],
): (string | undefined)[] {
  const clauses = entries.map((entry) => entry.clause);
  const seen = new Map<string, number[]>();
  entries.forEach((entry, index) => {
    if (entry.clause === undefined) return;
    const key = `${entry.cardId}\u0000${entry.timing ?? ""}\u0000${entry.clause}`;
    seen.set(key, [...(seen.get(key) ?? []), index]);
  });
  for (const indexes of seen.values()) {
    if (indexes.length < 2) continue;
    const first = entries[indexes[0]!]!;
    const printed = cardEffectClausesForTiming(first.cardId, first.timing, first.isInherited);
    if (printed.length < indexes.length) continue;
    indexes.forEach((entryIndex, position) => {
      clauses[entryIndex] = printed[position];
    });
  }
  return clauses;
}

/**
 * One [Once Per Turn] clause can be pending twice when separate events trigger it, such as
 * BT25-060 Rebootmon getting linked and then unsuspending. Only the first can activate, so
 * the chooser offers it once; the engine drops the other copy after it resolves.
 */
function onceActivatableIndexes(triggerKeys: readonly string[], clauses: readonly (string | undefined)[]): number[] {
  const seen = new Set<string>();
  return triggerKeys.flatMap((key, index) => {
    const clause = clauses[index];
    if (clause === undefined || !clause.includes("[Once Per Turn]")) return [index];
    const identity = `${parseTriggerKey(key).instanceId}\u0000${clause}`;
    if (seen.has(identity)) return [];
    seen.add(identity);
    return [index];
  });
}

/** Ask / Yes / No for the yes/no questions one pending effect will ask. */
function PresetControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Preset | undefined;
  onChange: (preset: Preset | undefined) => void;
}) {
  const { t } = useTranslation();
  const options: { preset: Preset | undefined; text: string }[] = [
    { preset: undefined, text: t("overlay.presetAsk") },
    { preset: "yes", text: t("overlay.presetYes") },
    { preset: "no", text: t("overlay.presetNo") },
  ];
  return (
    <div className="trigger-chooser__preset" role="group" aria-label={label}>
      {options.map(({ preset, text }) => (
        <button
          key={text}
          type="button"
          className="trigger-chooser__preset-option"
          aria-pressed={value === preset}
          onClick={() => onChange(preset)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
