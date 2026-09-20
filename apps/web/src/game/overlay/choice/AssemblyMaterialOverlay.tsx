import { useId, useState } from "react";
import { getCardDefinition, type AssemblyRequirement } from "@aegis/shared";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation, type Translate } from "../../../i18n";
import { assemblyMaterialCount, eligibleAssemblyCandidateIds } from "../../assemblyMaterialSelection";
import { CardArt } from "../CardArt";
import { printedCardName } from "../printedCardName";
import { Scrim } from "../Scrim";
import type { AssemblyCandidate } from "../types";
import { useEffectPromptFocus } from "./useEffectPromptFocus";
import { useBoardPreview } from "./useBoardPreview";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";
import "../effectPromptFamily.css";

/** Human-readable label for one Assembly material slot. */
function assemblySlotLabel(slot: AssemblyRequirement["materials"][number], t: Translate): string {
  if (slot.desc) return slot.desc;
  const parts: string[] = [];
  if (slot.namesExact?.length) parts.push(slot.namesExact.map((exactName) => `[${exactName}]`).join("/"));
  if (slot.names?.length) parts.push(slot.names.join("/"));
  if (slot.traits?.length) parts.push(`[${slot.traits.join("/")}]`);
  if (slot.nameOrTrait?.length) parts.push(slot.nameOrTrait.map((ref) => ref.tokens.join("/")).join(" or "));
  if (slot.colors?.length) parts.push(slot.colors.join("/"));
  if (slot.level !== undefined) parts.push(`Lv.${slot.level}`);
  else if (slot.levelMin !== undefined || slot.levelMax !== undefined)
    parts.push(`Lv.${slot.levelMin ?? "?"}–${slot.levelMax ?? "?"}`);
  if (slot.differentNames) parts.push(t("overlay.xrosDifferentNames"));
  if (slot.differentLevels) parts.push(t("overlay.assemblyDifferentLevels"));
  const label = parts.length ? parts.join(" ") : t("overlay.xrosAnyCard");
  return slot.count > 1 ? `${slot.count} × ${label}` : label;
}

/**
 * Overlay shown when the player plays a card with an Assembly requirement (§7-3) and the
 * trash holds enough qualifying cards. Unlike DigiXros the count is exact: confirm unlocks
 * only once the whole recipe is picked. The server validates the declaration; this is
 * best-effort client-side filtering.
 */
export function AssemblyMaterialOverlay({
  playingCardId,
  requirement,
  candidates,
  onConfirm,
  onSkip,
  onCancel,
}: {
  playingCardId: string;
  requirement: AssemblyRequirement;
  candidates: AssemblyCandidate[];
  /** Play with the picked trash materials, in pick order (§7-3-2-6 stacking order). */
  onConfirm: (materialInstanceIds: string[]) => void;
  /** Play the card normally at full cost. */
  onSkip: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const { isViewingBoard, openBoard, boardReturn } = useBoardPreview();
  const focusProps = useEffectPromptFocus(isViewingBoard);
  const [picks, setPicks] = useState<string[]>([]);
  const needed = assemblyMaterialCount(requirement);
  const candidateDefinitions = candidates.flatMap((candidate) => {
    const definition = getCardDefinition(candidate.cardId);
    return definition === undefined ? [] : [{ instanceId: candidate.instanceId, definition }];
  });
  const eligibleIds = eligibleAssemblyCandidateIds(requirement, candidateDefinitions, picks);
  const slotLabels = requirement.materials.map((slot) => assemblySlotLabel(slot, t));
  const playing = getCardDefinition(playingCardId);
  const reducedCost = Math.max(0, (playing?.playCost ?? 0) - requirement.reduceCost);

  const toggle = (instanceId: string) => {
    setPicks((prev) => (prev.includes(instanceId) ? prev.filter((id) => id !== instanceId) : [...prev, instanceId]));
  };

  if (isViewingBoard) return boardReturn;
  return (
    <Scrim className="game-modal">
      <div
        {...focusProps}
        className="game-modal__panel effect-prompt-family material-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 640,
          width: "100%",
          background: "var(--ds-surface)",
          borderRadius: 18,
          border: "1px solid var(--ds-border)",
          boxShadow: "var(--ds-shadow-summary)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CardArt cardId={playingCardId} width={64} />
          <div>
            <div
              id={titleId}
              style={{ fontFamily: "var(--ds-font-display)", fontWeight: 800, fontSize: 18, color: "var(--ds-fg)" }}
            >
              {t("overlay.assemblyTitle", { name: printedCardName(playingCardId) })}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)", marginTop: 2 }}>
              {t("overlay.assemblyDetail", { reduction: requirement.reduceCost, cost: reducedCost })}
              {slotLabels.length > 0 ? t("overlay.xrosAccepted", { slots: slotLabels.join(" × ") }) : null}
            </div>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div style={{ padding: "14px 0", textAlign: "center", fontSize: 13, color: "var(--ds-fg-disabled)" }}>
            {t("overlay.assemblyNoMaterials")}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 280, overflowY: "auto" }}>
            {candidates.map((candidate) => {
              const selected = picks.includes(candidate.instanceId);
              const disabled = !selected && !eligibleIds.has(candidate.instanceId);
              const accessibleName = t("overlay.xrosMaterialLabel", {
                name: printedCardName(candidate.cardId),
                zone: t("overlay.zone.trash"),
              });
              return (
                <button
                  key={candidate.instanceId}
                  onClick={() => !disabled && toggle(candidate.instanceId)}
                  disabled={disabled}
                  aria-label={accessibleName}
                  aria-pressed={selected}
                  title={accessibleName}
                  style={{
                    padding: 4,
                    borderRadius: 10,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.45 : 1,
                    filter: disabled ? "grayscale(0.6)" : "none",
                    background: selected ? "var(--ds-accent-surface)" : "var(--ds-surface-muted)",
                    border: `2px solid ${selected ? "var(--ds-accent)" : "transparent"}`,
                    transition: "background 100ms, border-color 100ms",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <CardArt cardId={candidate.cardId} artId={candidate.artId} width={72} />
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: selected ? "var(--ds-accent)" : "var(--ds-fg-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {selected ? `${picks.indexOf(candidate.instanceId) + 1}` : t("overlay.zone.trash")}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)" }}>
          {t("overlay.assemblySelected", { count: picks.length, needed })}
        </div>

        <div className="game-actions-row">
          <Button full icon={Icons.Sparkles} disabled={picks.length !== needed} onClick={() => onConfirm(picks)}>
            {t("overlay.assemblyConfirm", { count: needed })}
          </Button>
          <Button full variant="secondary" onClick={onSkip}>
            {t("overlay.assemblyPlayWithout")}
          </Button>
          {onCancel ? (
            <Button full variant="ghost" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          ) : null}
        </div>
        <div className="effect-prompt-family__board-action">
          <DecisionViewBoardButton onOpenBoard={openBoard} />
        </div>
      </div>
    </Scrim>
  );
}
