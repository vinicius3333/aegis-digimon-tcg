/* The right edge of the field: the opponent's raising area and security stack at the
   top, the viewer's own deck and trash at the bottom — the mirror of the left edge.

   The opponent's shield is also the drop area an attack on the player is released
   onto, and the tap target that declares the same attack. */

import type { RefObject } from "react";
import { useTranslation } from "../../../i18n";
import { BreedingSlot, Pile, type DropAttrs } from "../../piece";
import { Side } from "../../side";
import { hasFaceUpSecurity, securityAttackLabelKey } from "../../securityChrome";
import type { PermanentBurst } from "../../showcases";
import type { SecurityBreakCue } from "../../match/types";
import type { PresentedPlayer } from "../types";

export function RightPileColumn({
  opponent,
  opponentBreeding,
  viewer,
  pileWidth,
  compactPiles,
  viewerDeckRef,
  opponentSecurityRef,
  opponentEggDeckRiffling,
  viewerDeckRiffling,
  viewerTrashClassName,
  breedingBurst,
  securityCount,
  securityBreak,
  securityBreakMine,
  securityHit,
  securityLanding,
  securityDrop,
  attackable,
  selected,
  onOpenOpponentBreeding,
  onAttackSecurity,
  onOpenOpponentSecurity,
  onOpenViewerTrash,
}: {
  opponent: PresentedPlayer;
  /** The opponent's raising area as the narration has it, which may lag the board. */
  opponentBreeding: PresentedPlayer;
  viewer: PresentedPlayer;
  pileWidth: number;
  compactPiles: boolean;
  viewerDeckRef: RefObject<HTMLDivElement | null>;
  opponentSecurityRef: RefObject<HTMLDivElement | null>;
  opponentEggDeckRiffling: boolean;
  viewerDeckRiffling: boolean;
  /** The trash marks itself when an effect is resolving from the pile. */
  viewerTrashClassName: string;
  breedingBurst: PermanentBurst | undefined;
  /** What the shield shows: a scene still holding a card keeps the higher figure. */
  securityCount: number;
  securityBreak: SecurityBreakCue | null;
  /** The break on screen is this seat's, which is what arms and breaks the shield. */
  securityBreakMine: boolean;
  securityHit: boolean;
  securityLanding: boolean;
  securityDrop: DropAttrs;
  /** An attack on the player is available, which lights the shield and names it. */
  attackable: boolean;
  /** The security stack is the currently picked target in an in-board decision. */
  selected?: boolean;
  onOpenOpponentBreeding: (() => void) | undefined;
  onAttackSecurity: (() => void) | undefined;
  onOpenOpponentSecurity: (() => void) | undefined;
  onOpenViewerTrash: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <aside
      className="game-pile-column game-pile-column--right"
      style={{
        width: 130,
        flexShrink: 0,
        borderLeft: "1px solid var(--ds-border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 10px",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <div className="game-opponent-breeding" data-testid="opponent-breeding">
          <Pile
            className="game-utility-slot game-utility-slot--opp-eggs"
            width={pileWidth}
            compact={compactPiles}
            count={opponentBreeding.eggDeckCount}
            egg
            label={t("game.pile.eggs")}
            useSelectedSleeve={false}
            riffling={opponentEggDeckRiffling}
          />
          <div className="game-utility-slot game-utility-slot--opp-raising">
            <BreedingSlot
              perm={opponentBreeding.breeding}
              label={t("game.pile.raising")}
              compact={compactPiles}
              burst={breedingBurst}
              width={pileWidth}
              onClick={onOpenOpponentBreeding}
            />
          </div>
        </div>
        <Pile
          width={pileWidth}
          className={`game-security-pile${securityHit ? " game-security-shield--hit" : ""}`}
          compact={compactPiles}
          count={securityCount}
          shield={Side.Opponent}
          armed={securityBreakMine && securityBreak?.phase === "arm"}
          breaking={securityBreakMine && securityBreak?.phase === "break"}
          shardSeed={securityBreak?.key}
          securityDpDelta={opponent.securityDpDelta}
          faceUp={hasFaceUpSecurity(opponent.securityView)}
          securityCards={opponent.securityView}
          landing={securityLanding}
          attackLabel={attackable ? t(securityAttackLabelKey(opponent.securityCount)) : undefined}
          label={t("game.opponentSecurity")}
          useSelectedSleeve={false}
          refEl={(el) => {
            opponentSecurityRef.current = el;
          }}
          drop={securityDrop}
          glow={attackable}
          selected={selected}
          onClick={onAttackSecurity ?? onOpenOpponentSecurity}
        />
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <Pile
          className="game-utility-slot game-utility-slot--you-deck"
          width={pileWidth}
          compact={compactPiles}
          count={viewer.deckCount}
          label={t("game.pile.deck")}
          riffling={viewerDeckRiffling}
          refEl={(el) => {
            viewerDeckRef.current = el;
          }}
        />
        <Pile
          width={pileWidth}
          className={`game-utility-slot game-utility-slot--you-trash ${viewerTrashClassName}`}
          compact={compactPiles}
          count={viewer.trash.length}
          label={t("game.pile.trash")}
          topCardId={viewer.trash[viewer.trash.length - 1]?.cardId}
          topArtId={viewer.trash[viewer.trash.length - 1]?.artId}
          onClick={onOpenViewerTrash}
        />
      </div>
    </aside>
  );
}
