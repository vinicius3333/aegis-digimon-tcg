/* The raising area: the egg deck, the slot the hatched Digimon stands in, and the one
   line of hint that replaced the breeding dialog.

   One physical dock, two homes: a portrait screen puts it in the field, every other
   layout keeps it at the left of the bottom strip. Hatching is the egg deck's own
   click during the breeding step — the step used to open a dialog to ask for the same
   thing. */

import type { Permanent } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { BreedingSlot, Pile, type DropAttrs } from "../../piece";
import type { PermanentBurst } from "../../showcases";

export function BreedingDock({
  eggDeckCount,
  breeding,
  keywordLabels,
  pileWidth,
  compactPiles,
  burst,
  eggDeckRiffling,
  actionsOpen,
  canHatchEgg,
  canMoveOut,
  slotCandidate,
  slotDrop,
  onHatch,
  onSlotClick,
}: {
  eggDeckCount: number;
  breeding: Permanent | undefined;
  keywordLabels?: Readonly<Record<string, string>>;
  pileWidth: number;
  compactPiles: boolean;
  burst: PermanentBurst | undefined;
  eggDeckRiffling: boolean;
  /** The breeding step is open and nothing is holding the board, so the dock answers. */
  actionsOpen: boolean;
  canHatchEgg: boolean;
  canMoveOut: boolean;
  /** The slot is a legal destination: the move itself, or a digivolution into it. */
  slotCandidate: boolean;
  slotDrop: DropAttrs;
  onHatch: (() => void) | undefined;
  onSlotClick: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="game-breeding-dock"
      style={{
        width: 228,
        flexShrink: 0,
        borderRight: "1px solid var(--ds-border)",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--ds-foreground-muted)",
        }}
      >
        {t("game.breedingArea")}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
        <Pile
          width={pileWidth}
          className={`game-utility-slot game-utility-slot--you-eggs${actionsOpen && canHatchEgg ? " game-egg-deck--hatchable" : ""}`}
          compact={compactPiles}
          count={eggDeckCount}
          egg
          label={t("game.pile.eggs")}
          glow={actionsOpen && canHatchEgg}
          riffling={eggDeckRiffling}
          onClick={actionsOpen && canHatchEgg ? onHatch : undefined}
        />
        <div className="game-utility-slot game-utility-slot--you-raising">
          <BreedingSlot
            perm={breeding}
            keywordLabels={keywordLabels}
            label={t("game.pile.raising")}
            compact={compactPiles}
            burst={burst}
            // On a phone the dock is a row above the hand; a smaller slot gives
            // its height back to the battle rows while staying a 44px+ target.
            width={pileWidth}
            candidate={slotCandidate}
            focused={actionsOpen}
            drop={slotDrop}
            onClick={onSlotClick}
          />
        </div>
      </div>
      {actionsOpen ? (
        <p className="game-breeding-hint" role="status">
          {canHatchEgg
            ? t("game.breedingHint.hatch")
            : canMoveOut
              ? t("game.breedingHint.move")
              : t("game.breedingHint.end")}
        </p>
      ) : null}
    </div>
  );
}
