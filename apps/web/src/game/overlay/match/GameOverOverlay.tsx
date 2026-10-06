import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { gameOverSplash, type GameOverOutcome } from "../../gameOverSplash";

/**
 * The match's last moment. The existing Aegis screen reveals the result at its
 * resting size immediately, with the reason and actions ready on the same frame.
 *
 * Both halves of the ending are server truth. `gameOver` carries a discriminated
 * `result` and one of four `reason` codes; `gameOverSplash` only turns that pair
 * into words (game/gameOverSplash.ts).
 */
export function GameOverOverlay({
  result,
  reason,
  stats,
  onMenu,
  onRematch,
  returnsToRoom = false,
}: {
  result: GameOverOutcome;
  reason: string;
  stats: { value: number | string; label: string }[];
  onMenu: () => void;
  onRematch: () => void;
  /** A private match goes back to its room, where both players can switch decks. */
  returnsToRoom?: boolean;
}) {
  const { t } = useTranslation();
  const splash = gameOverSplash(result, reason);
  return (
    <div
      className={`game-result game-result--${splash.tone}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="aegis-game-over-title"
    >
      <div className="game-result__rays" aria-hidden="true" />
      <div className="game-result__panel">
        <p className="game-result__eyebrow">{t("overlay.matchComplete")}</p>
        <h1 id="aegis-game-over-title" className="game-result__title">
          {t(splash.titleKey)}
        </h1>
        <p className="game-result__reason">{t(splash.reasonKey)}</p>
        <div className="game-result__stats">
          {stats.map((entry) => (
            <div key={entry.label} className="game-result__stat">
              <span className="game-result__stat-value">{entry.value}</span>
              <span className="game-result__stat-label">{entry.label}</span>
            </div>
          ))}
        </div>
        <div className="game-actions-row">
          <Button full autoFocus icon={returnsToRoom ? Icons.Link2 : Icons.Swords} onClick={onRematch}>
            {t(returnsToRoom ? "overlay.backToRoom" : "overlay.findRematch")}
          </Button>
          <Button full variant="secondary" icon={Icons.LayoutDashboard} onClick={onMenu}>
            {t("overlay.mainMenu")}
          </Button>
        </div>
      </div>
    </div>
  );
}
