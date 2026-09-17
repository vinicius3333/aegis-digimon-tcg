/* In-game overlays, driven by real server state — mulligan window, block window,
   effect decision, game over, and the pre-match waiting panel. Each maps user
   choices to the typed intent callbacks GameScreen passes. The security check has
   its own centre-stage scene in ./SecurityClashView.

   The overlays themselves live under ./overlay, grouped by what they ask of the
   player: combat/ for the response windows, choice/ for the pickers and the
   decision dialog, viewer/ for the read-only inspectors, match/ for the lifecycle
   panels, and the shared pieces at the root. This file is the entry point they
   are still imported through. */

export { CardArt } from "./CardArt";
export { Scrim } from "./Scrim";
export { printedCardName } from "./printedCardName";

export {
  TIMING_LABELS,
  cardEffectClauseForTiming,
  effectClauseForTiming,
  playerFacingEffectClause,
  playerFacingPromptText,
  printedTimingLabel,
  resolvedEffectClause,
} from "./effectText";
export { ROLE_LABEL_KEYS, SUPPORTED_COMBAT_PROMPTS, SUPPORTED_DECISION_KINDS } from "./constants";
export type {
  AssemblyCandidate,
  DigiXrosCandidate,
  DigiXrosEligibleExpander,
  StackCard,
  TriggerDetail,
  TurnOrder,
} from "./types";

export { AllianceOverlay } from "./combat/AllianceOverlay";
export { BarrierOverlay } from "./combat/BarrierOverlay";
export { BlockOverlay } from "./combat/BlockOverlay";
export { CounterOverlay } from "./combat/CounterOverlay";
export { EvadeOverlay } from "./combat/EvadeOverlay";

export { GameOverOverlay } from "./match/GameOverOverlay";
export { MulliganOverlay } from "./match/MulliganOverlay";
export { WaitingOverlay } from "./match/WaitingOverlay";

export { ActionConfirmationOverlay } from "./choice/ActionConfirmationOverlay";
export { AssemblyMaterialOverlay } from "./choice/AssemblyMaterialOverlay";
export { DecisionOverlay } from "./choice/DecisionOverlay";
export { DigiXrosMaterialOverlay } from "./choice/DigiXrosMaterialOverlay";
export { DualPlayChoiceOverlay } from "./choice/DualPlayChoiceOverlay";
export { EvoCostChoiceOverlay } from "./choice/EvoCostChoiceOverlay";

export { CardActionMenu } from "./viewer/CardActionMenu";
export { CardZoomOverlay } from "./viewer/CardZoomOverlay";
export { PermanentDetailInspector } from "./viewer/PermanentDetailInspector";
export { PrintedCardInfo } from "./viewer/PrintedCardInfo";
export { StackViewerOverlay } from "./viewer/StackViewerOverlay";
export { TrashViewerOverlay } from "./viewer/TrashViewerOverlay";
