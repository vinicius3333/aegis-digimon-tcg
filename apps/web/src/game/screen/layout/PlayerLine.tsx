/* A player's name as one thin line: the opponent's in the top bar, the viewer's
   on the hand tray. Animated dots mark a player who is taking their turn, the
   way a typing indicator reads in a chat. */

import { useTranslation } from "../../../i18n";

export function PlayerLine({
  name,
  side,
  playing = false,
}: {
  name: string;
  side: "player" | "opponent";
  playing?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <p className="game-player-line" data-side={side}>
      <span className="game-player-line__name">{name}</span>
      {playing ? (
        <span className="game-player-line__waiting">
          <span className="aegis-sr-only">{t("game.playing")}</span>
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </span>
      ) : null}
    </p>
  );
}
