/* The bar across the top of the board: the opponent's counters, the fan of card
   backs that stands for their hand, and the match-level controls.

   Where those controls live is the only thing that varies. A portrait phone folds
   them into one menu, a narrow layout spells them out as icon buttons because the
   sidebar footer is out of reach mid-match, and the desktop — which dropped the
   sidebar — carries them as the reference client's circular header buttons. */

import type { CSSProperties, RefObject } from "react";
import type { Phase, Seat } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { Icons } from "../../../design/icons";
import { CardBack } from "../../../design/cards";
import { ArenaCounters } from "../../ArenaCounters";
import { useEnterAnimation } from "../../animations";
import { Side } from "../../side";
import { PlayerLine } from "./PlayerLine";

const OPPONENT_NAME_MAX_LENGTH = 12;

export function OpponentBar({
  handStripRef,
  opponentName,
  opponentAvatarId,
  viewerSeat,
  displayedTurnSeat,
  displayedTurnCount,
  phase,
  memory,
  eggDeckCount,
  handCount,
  deckCount,
  trashCount,
  portraitArena,
  narrowGameLayout,
  skippable,
  onOpenLog,
  onReportBug,
  onOpenArenaLook,
  onSurrender,
  onSkipPresentation,
  onResetScenario,
}: {
  handStripRef: RefObject<HTMLDivElement | null>;
  opponentName: string;
  opponentAvatarId: string;
  viewerSeat: Seat;
  displayedTurnSeat: Seat;
  displayedTurnCount: number;
  phase: Phase;
  memory: number;
  eggDeckCount: number;
  handCount: number;
  deckCount: number;
  trashCount: number;
  portraitArena: boolean;
  narrowGameLayout: boolean;
  /** There is something to fast-forward, so the desktop offers the skip button. */
  skippable: boolean;
  onOpenLog: () => void;
  onReportBug: () => void;
  onOpenArenaLook: () => void;
  onSurrender: () => void;
  onSkipPresentation: () => void;
  onResetScenario?: () => void;
}) {
  const { t } = useTranslation();
  const fanned = Math.max(0, handCount);
  const entering = useEnterAnimation(Array.from({ length: fanned }, (_, index) => String(index)));
  return (
    <header
      className="game-opponent-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 26px",
        borderBottom: "1px solid var(--ds-border)",
        background: "var(--ds-surface)",
      }}
    >
      <ArenaCounters side={Side.Opponent} eggs={eggDeckCount} hand={handCount} deck={deckCount} trash={trashCount} />
      <PlayerLine
        name={opponentName}
        avatarId={opponentAvatarId}
        side="opponent"
        maxLength={OPPONENT_NAME_MAX_LENGTH}
        playing={displayedTurnSeat !== viewerSeat}
      />
      <div
        className="game-opponent-hand"
        ref={handStripRef}
        role="img"
        aria-label={t("game.handCount", { count: handCount })}
        data-testid="opponent-hand"
        data-hand-count={handCount}
        style={
          {
            display: "flex",
            alignItems: "center",
            gap: 7,
            "--arena-opponent-hand-count": Math.max(1, fanned),
          } as CSSProperties
        }
      >
        {Array.from({ length: fanned }).map((_, i) => (
          <div
            key={i}
            data-opponent-hand-slot={i}
            className={entering.has(String(i)) ? "game-opponent-hand-card--arriving" : undefined}
            aria-hidden
            style={
              {
                marginLeft: i ? -22 : 0,
                "--arena-opponent-position": fanned < 2 ? 0.5 : i / (fanned - 1),
              } as CSSProperties
            }
          >
            <CardBack width={30} useSelectedSleeve={false} />
          </div>
        ))}
        <span
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 12,
            color: "var(--ds-foreground-muted)",
            marginLeft: 8,
          }}
        >
          {t("game.handCount", { count: handCount })}
        </span>
      </div>
      <div className="game-mobile-turn">
        <strong>
          {displayedTurnSeat === viewerSeat ? t("game.yourTurn") : t("game.opponentsTurn")} · {displayedTurnCount}
        </strong>
        <span>
          {t(`game.phase.${phase}` as const)} · {memory > 0 ? "+" : ""}
          {memory}
        </span>
      </div>
      {portraitArena ? (
        <details
          className="game-mobile-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("button")) event.currentTarget.open = false;
          }}
        >
          <summary aria-label={t("mobile.board.matchMenu")}>
            <Icons.MoreVertical size={20} />
          </summary>
          <div className="game-mobile-menu__actions">
            {onResetScenario ? (
              <button type="button" onClick={onResetScenario}>
                ↻ Reset battle
              </button>
            ) : null}
            <button type="button" onClick={onOpenLog}>
              <Icons.ScrollText size={18} /> {t("game.matchLog")}
            </button>
            <button type="button" onClick={onReportBug}>
              <Icons.Megaphone size={18} /> {t("bugReport.button")}
            </button>
            <button type="button" onClick={onOpenArenaLook}>
              <Icons.Palette size={18} /> {t("redesign.arena.look.open")}
            </button>
            <button type="button" onClick={onSurrender}>
              <Icons.LogOut size={18} /> {t("game.surrender")}
            </button>
          </div>
        </details>
      ) : narrowGameLayout ? (
        <>
          <button
            type="button"
            className="game-mobile-log"
            onClick={onOpenLog}
            aria-label={t("game.matchLog")}
            data-testid="log-strip"
          >
            <Icons.ScrollText size={16} />
          </button>
          <button className="game-mobile-bug" onClick={onReportBug} aria-label={t("bugReport.button")}>
            <Icons.Megaphone size={16} />
          </button>
          <button className="game-mobile-look" onClick={onOpenArenaLook} aria-label={t("redesign.arena.look.open")}>
            <Icons.Palette size={16} />
          </button>
          <button
            className="game-mobile-surrender"
            onClick={onResetScenario ?? onSurrender}
            aria-label={onResetScenario ? "Reset battle" : t("game.surrender")}
          >
            {onResetScenario ? "↻" : <Icons.LogOut size={16} />}
          </button>
        </>
      ) : (
        <div className="game-topbar-actions">
          {onResetScenario ? (
            <button
              type="button"
              className="game-topbar-button"
              onClick={onResetScenario}
              aria-label="Reset battle"
              title="Reset battle"
            >
              ↻
            </button>
          ) : null}
          <button className="game-topbar-button" onClick={onOpenLog} aria-label={t("game.matchLog")}>
            <Icons.ScrollText size={17} />
          </button>
          <button className="game-topbar-button" onClick={onReportBug} aria-label={t("bugReport.button")}>
            <Icons.Megaphone size={17} />
          </button>
          {/* Only while there is something to skip: a button that does nothing most
              of the match teaches players to ignore it. The phone has no equivalent
              — a tap anywhere on the board already advances the narration. Space and
              Enter come free with the native button; the match has no global keys. */}
          {skippable ? (
            <button
              className="game-topbar-button game-topbar-button--skip"
              onClick={onSkipPresentation}
              aria-label={t("game.skipPresentation")}
              title={t("game.skipPresentation")}
              data-testid="skip-presentation"
            >
              <Icons.FastForward size={17} />
            </button>
          ) : null}
          <button
            className="game-topbar-button game-topbar-button--look"
            onClick={onOpenArenaLook}
            aria-label={t("redesign.arena.look.open")}
            title={t("redesign.arena.look.open")}
          >
            <Icons.Palette size={17} />
          </button>
          <button
            className="game-topbar-button game-topbar-button--danger"
            onClick={onSurrender}
            aria-label={t("game.surrender")}
          >
            <Icons.LogOut size={17} />
          </button>
        </div>
      )}
    </header>
  );
}
