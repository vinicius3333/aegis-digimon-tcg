/* The viewer's own deck and trash.

   One pair of piles, two homes: the foot of the right rail, or — on a desktop too short
   for the rail to hold five piles — the right end of the bottom strip, mirroring the
   raising area at its left end. */

import type { RefObject } from "react";
import { useTranslation } from "../../../i18n";
import { Pile } from "../../piece";
import type { PresentedPlayer } from "../types";

export function ViewerPiles({
  viewer,
  docked,
  pileWidth,
  compactPiles,
  viewerDeckRef,
  viewerDeckRiffling,
  viewerTrashClassName,
  onOpenViewerTrash,
}: {
  viewer: PresentedPlayer;
  /** In the bottom strip, side by side, rather than stacked in the rail. */
  docked: boolean;
  pileWidth: number;
  compactPiles: boolean;
  viewerDeckRef: RefObject<HTMLDivElement | null>;
  viewerDeckRiffling: boolean;
  /** The trash marks itself when an effect is resolving from the pile. */
  viewerTrashClassName: string;
  onOpenViewerTrash: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  const topTrashCard = viewer.trash[viewer.trash.length - 1];
  return (
    <div
      className={docked ? "game-viewer-piles game-viewer-piles--docked" : "game-viewer-piles"}
      style={
        docked
          ? // Top-aligned so the viewer's counters fit underneath, at the strip's bottom-right.
            { display: "flex", flexShrink: 0, alignSelf: "flex-start", gap: 8, padding: "8px 16px" }
          : { display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }
      }
    >
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
        topCardId={topTrashCard?.cardId}
        topArtId={topTrashCard?.artId}
        onClick={onOpenViewerTrash}
      />
    </div>
  );
}
