/* The ribbon that announces whose turn has just begun. Which side it leans from is
   the only thing the viewer's seat changes about it. */

import type { Seat } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import type { TurnTransitionCue } from "../../match/types";

export function TurnBanner({ transition, viewerSeat }: { transition: TurnTransitionCue; viewerSeat: Seat }) {
  const { t } = useTranslation();
  const mine = transition.nextSeat === viewerSeat;
  return (
    <div className={`game-turn-banner${mine ? " game-turn-banner--you" : " game-turn-banner--opp"}`}>
      <span>{mine ? t("game.yourTurn") : t("game.opponentsTurn")}</span>
    </div>
  );
}
