/* Every surface the board can have open over it: the card menu, the stack and pile
   viewers, the play-choice prompts, the match log, the card blow-up and the bug report.

   Most of them are unfinished business, so server authority closing the window they
   belong to closes them too: a new decision, a combat window, a phase, a turn, or the
   end of the match. The stack viewer is exempt: it only reads a permanent, so the
   viewer keeps it open until they close it or the permanent leaves the board. */

import { useEffect, useState } from "react";
import type { DecisionRequest, GameState } from "@aegis/shared";
import type { Side } from "../../side";
import type {
  AppFusionChoice,
  AssemblyPick,
  CardMenuAnchor,
  DigiXrosPick,
  DualPlayChoice,
  EvoCostChoice,
  PendingActionConfirmation,
} from "../types";

export function useOverlayState({
  decision,
  state,
  clearSel,
}: {
  decision: DecisionRequest | undefined;
  state: GameState | undefined;
  clearSel: () => void;
}) {
  /** The permanent whose action menu is open, and where to anchor it. */
  const [cardMenu, setCardMenu] = useState<CardMenuAnchor | null>(null);
  /** The permanent whose stack viewer is open, by permanent id. */
  const [stackView, setStackView] = useState<string | null>(null);
  /** Which player's trash is open. */
  const [trashView, setTrashView] = useState<Side | null>(null);
  /** Which player's security stack is open. */
  const [securityView, setSecurityView] = useState<Side | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  // A board-mode decision the viewer asked to see in the dialog instead (Escape
  // or the rail's back arrow). Reset with every new decision.
  const [decisionAsDialog, setDecisionAsDialog] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // A card name clicked in the play log opens the card itself, without closing the log.
  const [zoomCardId, setZoomCardId] = useState<string | null>(null);
  const [zoomArtId, setZoomArtId] = useState<string | undefined>();
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [dualPlay, setDualPlay] = useState<DualPlayChoice | null>(null);
  const [assemblyPick, setAssemblyPick] = useState<AssemblyPick | null>(null);
  const [evoCostChoice, setEvoCostChoice] = useState<EvoCostChoice | null>(null);
  const [digiXrosPick, setDigiXrosPick] = useState<DigiXrosPick | null>(null);
  const [appFusionChoice, setAppFusionChoice] = useState<AppFusionChoice | null>(null);
  const [actionConfirm, setActionConfirm] = useState<PendingActionConfirmation | null>(null);

  // Discard unfinished declarations when server authority changes their action window.
  useEffect(() => {
    clearSel();
    setCardMenu(null);
    setTrashView(null);
    setSecurityView(null);
    setDigiXrosPick(null);
    setAssemblyPick(null);
    setActionConfirm(null);
    setEvoCostChoice(null);
    setAppFusionChoice(null);
    setDecisionAsDialog(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    decision?.decisionId,
    state?.pendingDecision?.decisionId,
    state?.combatWindow?.kind,
    state?.phase,
    state?.turnSeat,
    state?.gameOver,
  ]);

  return {
    cardMenu,
    setCardMenu,
    stackView,
    setStackView,
    trashView,
    setTrashView,
    securityView,
    setSecurityView,
    picks,
    setPicks,
    decisionAsDialog,
    setDecisionAsDialog,
    historyOpen,
    setHistoryOpen,
    zoomCardId,
    setZoomCardId,
    zoomArtId,
    setZoomArtId,
    bugReportOpen,
    setBugReportOpen,
    dualPlay,
    setDualPlay,
    assemblyPick,
    setAssemblyPick,
    evoCostChoice,
    setEvoCostChoice,
    digiXrosPick,
    setDigiXrosPick,
    appFusionChoice,
    setAppFusionChoice,
    actionConfirm,
    setActionConfirm,
  };
}
