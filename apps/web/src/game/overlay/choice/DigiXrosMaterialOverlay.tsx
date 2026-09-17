import { useEffect, useId, useState } from "react";
import type { DigiXrosRequirement } from "@aegis/shared";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { printedCardName } from "../printedCardName";
import { Scrim } from "../Scrim";
import type { DigiXrosCandidate, DigiXrosEligibleExpander } from "../types";
import { DigiXrosCandidateGrid } from "./DigiXrosCandidateGrid";
import { DigiXrosExpanderList } from "./DigiXrosExpanderList";
import { DigiXrosLockedZone } from "./DigiXrosLockedZone";
import { digiXrosMaterialPool } from "./digiXrosMaterialPool";
import { pruneDigiXrosPicksForZoneLimits, toggleDigiXrosPick } from "./digiXrosPicks";
import { digiXrosSlotLabel } from "./digiXrosSlotLabel";

/**
 * Overlay shown when the player initiates play of a card with a DigiXros requirement.
 * The player picks material instance ids from unlocked source zones, then confirms.
 * Skipping sends an empty material list (plain play at full cost — server validates).
 * The server is the sole authority on legality; this is best-effort client-side filtering.
 */
export function DigiXrosMaterialOverlay({
  playingCardId,
  requirements,
  candidates,
  lockedCandidates,
  eligibleExpanders,
  intrinsicTrashMax = 0,
  onConfirm,
  onSkip,
  onCancel,
}: {
  /** The card about to be played. */
  playingCardId: string;
  /** DigiXros requirements for the card (at least one entry). */
  requirements: DigiXrosRequirement[];
  /** Eligible material candidates (hand + battle area top cards). */
  candidates: DigiXrosCandidate[];
  /** Material candidates in zones locked behind selected expander Tamers. */
  lockedCandidates: DigiXrosCandidate[];
  /** Unsuspended expander Tamers that can be suspended for this DigiXros play. */
  eligibleExpanders: DigiXrosEligibleExpander[];
  /** Trash capacity granted by the played card itself, without suspending a Tamer. */
  intrinsicTrashMax?: number;
  /** Confirm with the chosen materials and expander Tamers to suspend. */
  onConfirm: (materialInstanceIds: string[], expanderPermanentIds: string[]) => void;
  /** Play the card normally without DigiXros (full cost, no materials). */
  onSkip: () => void;
  /** Cancel: go back without playing. */
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [picks, setPicks] = useState<string[]>([]);
  const [chosenExpanderPermanentIds, setChosenExpanderPermanentIds] = useState<string[]>([]);

  const req = requirements[0]!;
  const reductionLabel =
    req.count === "∞"
      ? req.costReduction !== undefined
        ? t("overlay.xrosReductionPerCard", { count: req.costReduction })
        : t("overlay.xrosReductionVariable")
      : t("overlay.xrosReductionPerPlaced", { count: req.count });

  const slotLabels = req.materials.map((material) => digiXrosSlotLabel({ material, t }));
  const {
    trashMax,
    underTamerMax,
    trashCandidates,
    underTamerCandidates,
    candidateById,
    eligibleCandidateIds,
    pickedTrash,
    pickedUnderTamer,
  } = digiXrosMaterialPool({
    requirement: req,
    candidates,
    lockedCandidates,
    eligibleExpanders,
    chosenExpanderPermanentIds,
    intrinsicTrashMax,
    picks,
  });

  useEffect(() => {
    setPicks((prev) => pruneDigiXrosPicksForZoneLimits({ picks: prev, lockedCandidates, trashMax, underTamerMax }));
  }, [lockedCandidates, trashMax, underTamerMax]);

  const toggleExpander = (permanentId: string) => {
    setChosenExpanderPermanentIds((prev) =>
      prev.includes(permanentId) ? prev.filter((id) => id !== permanentId) : [...prev, permanentId],
    );
  };

  const toggle = (candidate: DigiXrosCandidate) => {
    setPicks((prev) => toggleDigiXrosPick({ picks: prev, candidate, candidateById, trashMax, underTamerMax }));
  };

  const gridProps = {
    eligibleCandidateIds,
    picks,
    pickedTrash,
    pickedUnderTamer,
    trashMax,
    underTamerMax,
    onToggle: toggle,
    t,
  };

  return (
    <Scrim className="game-modal">
      <div
        className="game-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 640,
          width: "100%",
          background: "var(--ds-surface)",
          borderRadius: 20,
          border: "1px solid var(--ds-border)",
          boxShadow: "var(--ds-shadow-summary)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "var(--ds-accent-surface)",
              color: "var(--ds-accent)",
              flexShrink: 0,
            }}
          >
            <Icons.Sparkles size={20} />
          </div>
          <div>
            <div
              id={titleId}
              style={{ fontFamily: "var(--ds-font-display)", fontWeight: 800, fontSize: 18, color: "var(--ds-fg)" }}
            >
              {t("overlay.xrosTitle", { name: printedCardName(playingCardId) })}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ds-fg-muted)", marginTop: 2 }}>
              {t("overlay.xrosDetail", { reduction: reductionLabel })}
              {slotLabels.length > 0 ? t("overlay.xrosAccepted", { slots: slotLabels.join(" × ") }) : null}
            </div>
          </div>
        </div>

        {eligibleExpanders.length > 0 ? (
          <DigiXrosExpanderList
            eligibleExpanders={eligibleExpanders}
            chosenExpanderPermanentIds={chosenExpanderPermanentIds}
            onToggle={toggleExpander}
            t={t}
          />
        ) : null}

        <DigiXrosCandidateGrid items={candidates} emptyText={t("overlay.xrosNoMaterials")} {...gridProps} />
        <DigiXrosLockedZone
          label={t("overlay.xrosZoneTrash")}
          items={trashCandidates}
          max={trashMax}
          hasEligibleExpanders={eligibleExpanders.length > 0}
          {...gridProps}
        />
        <DigiXrosLockedZone
          label={t("overlay.xrosZoneUnderTamers")}
          items={underTamerCandidates}
          max={underTamerMax}
          hasEligibleExpanders={eligibleExpanders.length > 0}
          {...gridProps}
        />

        <div style={{ fontSize: 12, color: "var(--ds-fg-muted)" }}>
          {picks.length === 0 ? t("overlay.xrosNoneSelected") : t("overlay.xrosSelected", { count: picks.length })}
        </div>

        <div className="game-actions-row">
          <Button
            full
            icon={Icons.Sparkles}
            disabled={picks.length === 0}
            onClick={() => onConfirm(picks, chosenExpanderPermanentIds)}
          >
            {picks.length === 1 ? t("overlay.xrosConfirmOne") : t("overlay.xrosConfirm", { count: picks.length })}
          </Button>
          <Button full variant="secondary" onClick={onSkip}>
            {t("overlay.xrosPlayWithout")}
          </Button>
          <Button full variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </Scrim>
  );
}
