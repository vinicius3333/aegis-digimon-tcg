import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { gameOverSplash, type GameOverOutcome } from "../../gameOverSplash";

const HEADER_GAP_PX = 12;

/** How much the bar spells out, from everything down to icons only. */
type BarDensity = "full" | "brief" | "compact";

const BAR_DENSITIES: readonly BarDensity[] = ["full", "brief", "compact"];

interface BarPlacement {
  density: BarDensity;
  style?: CSSProperties;
}

/**
 * Where the board-review bar fits without covering the opponent's hand fan or the match
 * buttons, which share the header with it. Their widths depend on the hand size and the
 * layout, so the bar measures the room between them instead of guessing breakpoints:
 * the densest form that fits, else the icon-only bar centred below the header.
 */
function placeBar(bar: HTMLElement): BarPlacement | undefined {
  const container = (bar.offsetParent ?? document.body).getBoundingClientRect();
  const hand = document.querySelector(".game-opponent-hand")?.getBoundingClientRect();
  const actions = document.querySelector(".game-topbar-actions")?.getBoundingClientRect();
  const header = document.querySelector(".game-opponent-bar")?.getBoundingClientRect();
  if (!hand || !actions || !header || actions.width === 0) return undefined;
  const room = actions.left - hand.right - 2 * HEADER_GAP_PX;
  const widthWhen = (density: BarDensity) => {
    for (const each of BAR_DENSITIES) bar.classList.toggle(`game-result-bar--${each}`, each === density);
    return bar.offsetWidth;
  };
  const density = BAR_DENSITIES.find((each) => widthWhen(each) <= room);
  if (density) {
    return {
      density,
      style: { left: "auto", right: container.right - actions.left + HEADER_GAP_PX, translate: "none" },
    };
  }
  return { density: "compact", style: { top: header.bottom - container.top + HEADER_GAP_PX } };
}

/**
 * The match's last moment. The existing Aegis screen reveals the result at its
 * resting size immediately, with the reason and actions ready on the same frame.
 *
 * Both halves of the ending are server truth. `gameOver` carries a discriminated
 * `result` and one of four `reason` codes; `gameOverSplash` only turns that pair
 * into words (game/gameOverSplash.ts).
 *
 * "View board" folds the splash into a slim bar so the viewer can study the final
 * board, their hand, and every pile; the bar brings the splash back. Once the server
 * reveals the hidden zones, the face-down piles on the board open too, and the bar says so.
 */
export function GameOverOverlay({
  spectatorResult,
  result,
  reason,
  stats,
  cardsRevealed = false,
  onMenu,
  onRematch,
  returnsToRoom = false,
}: {
  spectatorResult?: string;
  result: GameOverOutcome;
  reason: string;
  stats: { value: number | string; label: string }[];
  /** The server revealed every hidden zone, so the face-down piles open. */
  cardsRevealed?: boolean;
  onMenu: () => void;
  onRematch: () => void;
  /** A private match goes back to its room, where both players can switch decks. */
  returnsToRoom?: boolean;
}) {
  const { t } = useTranslation();
  const splash = gameOverSplash(result, reason);
  const [reviewingBoard, setReviewingBoard] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<BarPlacement>({ density: "full" });

  useLayoutEffect(() => {
    if (!reviewingBoard) return;
    const place = () => {
      if (barRef.current) setPlacement(placeBar(barRef.current) ?? { density: "full" });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [reviewingBoard]);
  const title = spectatorResult ? t("spectator.finished") : t(splash.titleKey);

  if (reviewingBoard) {
    return (
      <div
        ref={barRef}
        className={`game-result-bar game-result--${splash.tone} game-result-bar--${placement.density}`}
        style={placement.style}
        role="status"
      >
        <span className="game-result-bar__title">{title}</span>
        {cardsRevealed ? <span className="game-result-bar__hint">{t("overlay.reveal.hint")}</span> : null}
        <Button
          className="game-result-bar__show"
          size="sm"
          variant="secondary"
          icon={Icons.Maximize}
          aria-label={t("overlay.showResult")}
          title={t("overlay.showResult")}
          onClick={() => setReviewingBoard(false)}
        >
          <span className="game-result-bar__label">{t("overlay.showResult")}</span>
        </Button>
      </div>
    );
  }

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
          {title}
        </h1>
        <p className="game-result__reason">{spectatorResult ?? t(splash.reasonKey)}</p>
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
            {t(spectatorResult ? "spectator.back" : returnsToRoom ? "overlay.backToRoom" : "overlay.findRematch")}
          </Button>
          <Button full variant="secondary" icon={Icons.LayoutDashboard} onClick={onMenu}>
            {t("overlay.mainMenu")}
          </Button>
        </div>
        <Button
          className="game-result__view-board"
          variant="ghost"
          size="sm"
          icon={Icons.Eye}
          onClick={() => setReviewingBoard(true)}
        >
          {t("overlay.viewBoard")}
        </Button>
      </div>
    </div>
  );
}
