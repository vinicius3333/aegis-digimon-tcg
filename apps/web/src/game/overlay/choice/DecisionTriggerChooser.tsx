import type { DecisionResponse } from "@aegis/shared";
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

/** The chooser for an `orderTriggers` decision: pick which of several pending effects fires next. */
export function DecisionTriggerChooser({
  triggerKeys,
  triggerCardIds,
  triggerDetails,
  selectedTriggerKeys,
  wideDialog,
  timing,
  triggerTimings,
  triggerDescriptions,
  triggerIsInherited,
  onToggle,
  onRespond,
  onOpenBoard,
}: {
  triggerKeys: readonly string[];
  triggerCardIds: readonly string[];
  /** Aligned to `triggerKeys`; empty means the chooser shows names only. */
  triggerDetails: readonly TriggerDetail[];
  selectedTriggerKeys: readonly string[];
  wideDialog: boolean;
  timing: string | undefined;
  triggerTimings: readonly string[] | undefined;
  triggerDescriptions: readonly string[] | undefined;
  triggerIsInherited: readonly boolean[] | undefined;
  onToggle: (key: string) => void;
  onRespond: (response: DecisionResponse) => void;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
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

  return (
    <div className="trigger-chooser__layout">
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
        {t(triggerKeys.length === 1 ? "overlay.confirmPendingEffect" : "overlay.chooseNextEffect")}
      </div>
      {commonTriggerTiming ? <div className="trigger-chooser__context">{commonTriggerTiming}</div> : null}
      <div className="trigger-chooser">
        {triggerKeys.map((key, i) => {
          const chosen = selectedTriggerKeys.includes(key);
          const cardId = triggerCardIds[i] ?? triggerCardId(key);
          const detail = triggerDetails[i];
          const timingLabel = triggerTimingLabels[i];
          const activeClause = entryClauses[i];
          return (
            <button
              type="button"
              key={key}
              className={`trigger-chooser__option${chosen ? " trigger-chooser__option--chosen" : ""}`}
              aria-label={[timingLabel, triggerKeyLabels[i], detail?.sourceLabel].filter(Boolean).join(", ")}
              aria-pressed={chosen}
              onClick={() => onToggle(key)}
            >
              <span className="trigger-chooser__heading">
                <span className="trigger-chooser__card">
                  <CardFull cardId={cardId} width={wideDialog ? 96 : 72} zoomOnHover={false} />
                </span>
                <span className="trigger-chooser__meta">
                  <span className="trigger-chooser__name">{triggerKeyLabels[i]}</span>
                  <span className="trigger-chooser__id">{cardId}</span>
                  {detail?.sourceLabel ? <span className="trigger-chooser__source">{detail.sourceLabel}</span> : null}
                </span>
                {chosen ? (
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
          );
        })}
      </div>
      <div className="trigger-chooser__footer">
        <DecisionViewBoardButton onOpenBoard={onOpenBoard} />
        <Button
          size="lg"
          icon={Icons.Check}
          disabled={selectedTriggerKeys.length !== 1}
          onClick={() => onRespond({ kind: "orderTriggers", order: [...selectedTriggerKeys] })}
        >
          {t(triggerKeys.length === 1 ? "overlay.resolveEffect" : "overlay.resolveNextEffect")}
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
