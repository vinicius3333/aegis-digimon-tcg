/* The strip between the two battle rows: the phase ribbon, the memory gauge and the
   turn control. The ribbon is announced here rather than over the board because it is
   the boundary between the two halves that the phase actually moves. */

import { Phase, type GameState, type Seat } from "@aegis/shared";
import { MatchTimer } from "../../MatchTimer";
import { useTranslation } from "../../../i18n";
import { MemoryGauge, TurnControl } from "../../piece";
import type { PhaseBanner } from "../../phaseBanner";
import type { TurnControlState } from "../../turnControl";

export function MemoryBand({
  timerState,
  viewerSeat,
  phaseBanner,
  memory,
  compact,
  displayedPhase,
  phaseSweeping,
  memoryPrediction,
  turnControlState,
  endPhaseBlocked,
  onEndPhase,
}: {
  timerState?: GameState;
  viewerSeat?: Seat;
  phaseBanner: PhaseBanner | null;
  memory: number;
  compact: boolean;
  displayedPhase: Phase;
  /** The unsuspend sweep is running, which the gauge's phase label animates with. */
  phaseSweeping: boolean;
  /** Where memory would land if the action the pointer is offering were taken. */
  memoryPrediction: number | undefined;
  turnControlState: TurnControlState;
  endPhaseBlocked: boolean;
  onEndPhase: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="game-memory-band" style={{ flexShrink: 0, position: "relative" }}>
      {phaseBanner ? (
        <div className="game-phase-banner" data-side={phaseBanner.side} key={phaseBanner.key} role="status">
          <span>{t(phaseBanner.labelKey)}</span>
        </div>
      ) : null}

      <MemoryGauge
        value={memory}
        compact={compact}
        phaseLabel={t(`game.phase.${displayedPhase}` as `game.phase.${Phase}`)}
        phaseSweeping={phaseSweeping}
        prediction={memoryPrediction}
      />
      <div className={timerState?.matchTimer ? "game-turn-clock-control" : "game-turn-clock-control--off"}>
        {timerState && viewerSeat !== undefined ? <MatchTimer state={timerState} seat={viewerSeat} /> : null}
        <TurnControl
          state={turnControlState}
          covered={endPhaseBlocked ? true : undefined}
          onEndPhase={() => !endPhaseBlocked && onEndPhase()}
        />
      </div>
      {/* A visual summary only: the phase banner above announces each change. */}
      <ol className="game-phase-rail" aria-hidden="true">
        {PHASE_RAIL.map((phase) => (
          <li
            key={phase}
            className="game-phase-rail__step"
            aria-current={phase === displayedPhase ? "step" : undefined}
          >
            {t(`game.phase.${phase}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The phases a turn passes through before it can end, in order. */
const PHASE_RAIL = [Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main] as const;
