/* The two piles a player can look through: a trash, which is public, and a security
   stack, which is not.

   Only face-up security cards are public; face-down cards stay hidden even from their
   owner, because the rules do not let the stack be looked at. The viewer therefore
   keeps every position — a hidden card is an empty slot, not a missing one. */

import { useTranslation } from "../../../i18n";
import { TrashViewerOverlay } from "../../overlay";
import { Side } from "../../side";
import type { PresentedPlayer } from "../types";

export function PileViewers({
  trashView,
  securityView,
  viewer,
  opponent,
  opponentName,
  sheet,
  onCloseTrash,
  onCloseSecurity,
}: {
  /** Which player's trash is open, or nothing. */
  trashView: Side | null;
  /** Which player's security stack is open, or nothing. */
  securityView: Side | null;
  viewer: PresentedPlayer;
  opponent: PresentedPlayer;
  opponentName: string;
  sheet: boolean;
  onCloseTrash: () => void;
  onCloseSecurity: () => void;
}) {
  const { t } = useTranslation();
  const trashOwner = trashView === Side.Viewer ? viewer : opponent;
  const securityOwner = securityView === Side.Viewer ? viewer : opponent;
  const faceUpCount = Array.from(securityOwner.securityView ?? []).filter((card) => card?.faceUp).length;
  return (
    <>
      {trashView ? (
        <TrashViewerOverlay
          title={trashView === Side.Viewer ? t("game.yourTrash") : t("game.oppTrash", { name: opponentName })}
          cardIds={trashOwner.trash.map((c) => c.cardId)}
          artIds={trashOwner.trash.map((c) => c.artId)}
          sheet={sheet}
          onClose={onCloseTrash}
        />
      ) : null}

      {securityView ? (
        <TrashViewerOverlay
          title={
            securityView === Side.Viewer
              ? t("game.yourSecurityPile")
              : t("game.oppSecurityPile", { name: opponentName })
          }
          cardIds={Array.from({ length: securityOwner.securityCount }, (_, index) => {
            const card = securityOwner.securityView?.[index];
            return card?.faceUp ? card.cardId : "";
          })}
          artIds={Array.from({ length: securityOwner.securityCount }, (_, index) => {
            const card = securityOwner.securityView?.[index];
            return card?.faceUp ? card.artId : "";
          })}
          preserveOrder
          countLabel={t("overlay.securityCount", { faceUp: faceUpCount, count: securityOwner.securityCount })}
          emptyLabel={t("overlay.securityNoFaceUp")}
          sheet={sheet}
          onClose={onCloseSecurity}
        />
      ) : null}
    </>
  );
}
