/* What the viewer opens for themselves — the match log, a card blown up, the bug
   report — and the two the match opens over them: an opponent who dropped, and the
   result once the game is over. */

import { BugReportDialog } from "../../../bugs/BugReportDialog";
import { PlayLogSidebar } from "../../OpponentActionFeedView";
import { CardZoomOverlay, GameOverOverlay, OpponentDroppedOverlay } from "../../overlay";
import type { LogLine } from "../../matchLog";
import type { GameOverOutcome } from "../../gameOverSplash";

export function MatchStatusOverlays({
  log,
  historyOpen,
  zoomCardId,
  zoomArtId,
  bugReportOpen,
  matchLogId,
  signedIn,
  opponentDropped,
  gameOver,
  onCloseHistory,
  onOpenCard,
  onCloseZoom,
  onCloseBugReport,
  onMenu,
  onRematch,
  returnsToRoom,
}: {
  log: readonly LogLine[];
  historyOpen: boolean;
  zoomCardId: string | null;
  zoomArtId: string | undefined;
  bugReportOpen: boolean;
  matchLogId: string;
  /** Only shapes what the report dialog says about follow-up questions. */
  signedIn: boolean;
  /** The opponent's socket is gone and the match has not ended, so the board waits. */
  opponentDropped: boolean;
  /** The result and its stats, or nothing while the match is still running. */
  gameOver: { result: GameOverOutcome; reason: string; stats: { value: number; label: string }[] } | undefined;
  onCloseHistory: () => void;
  onOpenCard: (cardId: string) => void;
  onCloseZoom: () => void;
  onCloseBugReport: () => void;
  onMenu: () => void;
  onRematch: () => void;
  returnsToRoom?: boolean;
}) {
  return (
    <>
      {historyOpen ? <PlayLogSidebar log={log} onClose={onCloseHistory} onOpenCard={onOpenCard} /> : null}

      {zoomCardId ? <CardZoomOverlay cardId={zoomCardId} artId={zoomArtId} onClose={onCloseZoom} /> : null}

      {bugReportOpen ? (
        <BugReportDialog signedIn={signedIn} matchLogId={matchLogId} onClose={onCloseBugReport} />
      ) : null}

      {opponentDropped ? <OpponentDroppedOverlay /> : null}

      {gameOver ? (
        <GameOverOverlay
          result={gameOver.result}
          reason={gameOver.reason}
          stats={gameOver.stats}
          onMenu={onMenu}
          onRematch={onRematch}
          returnsToRoom={returnsToRoom}
        />
      ) : null}
    </>
  );
}
