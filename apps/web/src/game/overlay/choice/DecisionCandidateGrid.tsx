import { CardFull } from "../../../design/cards";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { printedCardName } from "../printedCardName";
import type { PendingFateBadge } from "../../pendingFate";
import { abstractTargetLabel, cardCopyLabelsByInstance } from "./decisionCandidateLabels";
import type { DecisionCandidate } from "./decisionTypes";

/** The grid of selectable targets for a `chooseTargets` / `selectCards` decision. */
export function DecisionCandidateGrid({
  candidates,
  picks,
  min,
  max,
  maxTotalPlayCost,
  selectedPlayCost,
  withinPlayCostBudget,
  wideDialog,
  fateBadge,
  onTogglePick,
}: {
  candidates: readonly DecisionCandidate[];
  picks: readonly string[];
  min: number;
  max: number;
  maxTotalPlayCost?: number;
  selectedPlayCost: number;
  withinPlayCostBudget: boolean;
  wideDialog: boolean;
  fateBadge?: PendingFateBadge;
  onTogglePick: (instanceId: string) => void;
}) {
  const { t } = useTranslation();
  const candidateCardWidth = wideDialog ? 154 : 110;
  // Past this many the grid would wrap into rows taller than the sheet, so it
  // becomes one scrolling row with a visible track instead (reference #110).
  const scrollCandidates = candidates.length > 6;
  const cardCopyLabels = cardCopyLabelsByInstance({ candidates, t });

  return (
    <div style={{ marginBottom: 18 }}>
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
        {t("overlay.selectTargets", { range: min === max ? max : `${min}–${max}` })}
        <span style={{ float: "right", color: picks.length ? "var(--ds-accent)" : "inherit" }}>
          {t("overlay.chosen", { count: picks.length })}
        </span>
      </div>
      {maxTotalPlayCost !== undefined ? (
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: withinPlayCostBudget ? "var(--ds-fg-secondary)" : "var(--ds-danger)",
            marginBottom: 10,
          }}
        >
          {t("overlay.playCostBudget", { selected: selectedPlayCost, max: maxTotalPlayCost })}
        </div>
      ) : null}
      <div className={`decision-overlay__grid${scrollCandidates ? " decision-overlay__grid--scroll" : ""}`}>
        {candidates.map((cand) => {
          const selectable = cand.selectable !== false;
          const on = picks.includes(cand.instanceId);
          const abstractLabel = abstractTargetLabel({ instanceId: cand.instanceId, t });
          const copyLabel = cardCopyLabels.get(cand.instanceId);
          const sourceLabel =
            cand.sourceCount === undefined
              ? undefined
              : t(cand.sourceCount === 1 ? "overlay.sourceCountOne" : "overlay.sourceCountMany", {
                  count: cand.sourceCount,
                });
          const liveLabels = [
            cand.currentDP === undefined ? undefined : `${cand.currentDP.toLocaleString()} DP`,
            cand.isSuspended === true ? t("overlay.suspended") : undefined,
            sourceLabel,
          ].filter((label): label is string => label !== undefined);
          const liveLabel = liveLabels.join(" · ");
          return (
            <button
              type="button"
              aria-label={`${abstractLabel ?? (cand.cardId ? printedCardName(cand.cardId) : t("overlay.card"))}${liveLabels.length ? `, ${liveLabels.join(", ")}` : ""}${copyLabel ? `, ${copyLabel}` : ""}${on ? t("overlay.selected") : ""}`}
              aria-pressed={on}
              disabled={!selectable}
              key={cand.instanceId}
              style={{
                position: "relative",
                padding: 0,
                border: "none",
                borderRadius: 10,
                background: "transparent",
                cursor: selectable ? "pointer" : "not-allowed",
                opacity: selectable ? 1 : 0.4,
                filter: selectable ? "none" : "grayscale(0.85)",
              }}
              onClick={() => selectable && onTogglePick(cand.instanceId)}
            >
              {abstractLabel ? (
                <span
                  style={{
                    width: candidateCardWidth,
                    minHeight: candidateCardWidth * 1.4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    border: `2px solid ${on ? "var(--ds-accent)" : "var(--ds-border)"}`,
                    background: "var(--ds-surface-muted)",
                    color: on ? "var(--ds-accent)" : "var(--ds-fg-secondary)",
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  <Icons.Shield size={30} />
                  {abstractLabel}
                </span>
              ) : (
                <CardFull cardId={cand.cardId ?? ""} artId={cand.artId} width={candidateCardWidth} selected={on} />
              )}
              {on && max > 1 ? (
                <span className="decision-overlay__order-badge" aria-hidden="true">
                  {picks.indexOf(cand.instanceId) + 1}
                </span>
              ) : null}
              {/* What the effect will do to this card, once it has been
                  chosen. Server truth: `options.targetFate` is projected from
                  the IR action that raised the prompt, so the badge never
                  guesses an outcome out of the prompt's English. */}
              {on && fateBadge ? (
                <span
                  className={`game-fate-badge game-fate-badge--${fateBadge.tone} decision-overlay__fate`}
                  data-fate={fateBadge.fate}
                  // The prompt above already reads the effect out in full, so
                  // the pill must not also rewrite this tile's own name.
                  aria-hidden="true"
                >
                  <i aria-hidden="true">{fateBadge.glyph}</i>
                  {t(fateBadge.labelKey)}
                </span>
              ) : null}
              {liveLabel ? (
                <span
                  style={{
                    position: "absolute",
                    left: 6,
                    bottom: 6,
                    padding: "3px 7px",
                    borderRadius: 7,
                    background: "var(--ds-surface)",
                    color: "var(--ds-fg)",
                    fontFamily: "var(--ds-font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    boxShadow: "var(--ds-shadow-sm)",
                  }}
                >
                  {liveLabel}
                </span>
              ) : null}
              {on ? (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    color: "var(--ds-accent)",
                    background: "var(--ds-surface)",
                    borderRadius: "50%",
                  }}
                >
                  <Icons.CircleCheck size={18} />
                </span>
              ) : null}
              {!selectable ? (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    color: "var(--ds-fg-muted)",
                    background: "var(--ds-surface)",
                    borderRadius: "50%",
                  }}
                >
                  <Icons.Ban size={16} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
