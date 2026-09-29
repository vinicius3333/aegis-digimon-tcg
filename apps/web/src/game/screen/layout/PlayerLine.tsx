/* A player's name as one thin line: the opponent's in the top bar, the viewer's
   on the hand tray. The player whose turn it is not shows waiting dots. */

import { useTranslation } from "../../../i18n";

export function PlayerLine({ name, side, waiting }: { name: string; side: "player" | "opponent"; waiting: boolean }) {
  const { t } = useTranslation();
  return (
    <p className="game-player-line" data-side={side}>
      <span className="game-player-line__name">{name}</span>
      {waiting ? (
        <span className="game-player-line__waiting">
          <span className="aegis-sr-only">{t("game.waiting")}</span>
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </span>
      ) : null}
    </p>
  );
}
