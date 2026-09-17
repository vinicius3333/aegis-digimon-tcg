/* In-game overlays, driven by real server state — mulligan window, block window,
   effect decision, game over, and the pre-match waiting panel. Each maps user
   choices to the typed intent callbacks GameScreen passes. The security check has
   its own centre-stage scene in ./SecurityClashView.

   The overlays themselves live under ./overlay, grouped by what they ask of the
   player: combat/ for the response windows, choice/ for the pickers and the
   decision dialog, viewer/ for the read-only inspectors, match/ for the lifecycle
   panels, and the shared pieces at the root. This file is the entry point they
   are still imported through. */

export { CardArt } from "./overlay/CardArt";
export { Scrim } from "./overlay/Scrim";
export { printedCardName } from "./overlay/printedCardName";

export {
  TIMING_LABELS,
  cardEffectClauseForTiming,
  effectClauseForTiming,
  playerFacingEffectClause,
  playerFacingPromptText,
  printedTimingLabel,
  resolvedEffectClause,
} from "./overlay/effectText";
export { ROLE_LABEL_KEYS, SUPPORTED_COMBAT_PROMPTS, SUPPORTED_DECISION_KINDS } from "./overlay/constants";
export type {
  AssemblyCandidate,
  DigiXrosCandidate,
  DigiXrosEligibleExpander,
  StackCard,
  TriggerDetail,
  TurnOrder,
} from "./overlay/types";

export { AllianceOverlay } from "./overlay/combat/AllianceOverlay";
export { BarrierOverlay } from "./overlay/combat/BarrierOverlay";
export { BlockOverlay } from "./overlay/combat/BlockOverlay";
export { CounterOverlay } from "./overlay/combat/CounterOverlay";
export { EvadeOverlay } from "./overlay/combat/EvadeOverlay";

export { GameOverOverlay } from "./overlay/match/GameOverOverlay";
export { MulliganOverlay } from "./overlay/match/MulliganOverlay";
export { WaitingOverlay } from "./overlay/match/WaitingOverlay";

export { ActionConfirmationOverlay } from "./overlay/choice/ActionConfirmationOverlay";
export { AssemblyMaterialOverlay } from "./overlay/choice/AssemblyMaterialOverlay";
export { DecisionOverlay } from "./overlay/choice/DecisionOverlay";
export { DigiXrosMaterialOverlay } from "./overlay/choice/DigiXrosMaterialOverlay";
export { DualPlayChoiceOverlay } from "./overlay/choice/DualPlayChoiceOverlay";
export { EvoCostChoiceOverlay } from "./overlay/choice/EvoCostChoiceOverlay";

export { CardActionMenu } from "./overlay/viewer/CardActionMenu";
export { CardZoomOverlay } from "./overlay/viewer/CardZoomOverlay";
export { PermanentDetailInspector } from "./overlay/viewer/PermanentDetailInspector";
export { PrintedCardInfo } from "./overlay/viewer/PrintedCardInfo";
export { StackViewerOverlay } from "./overlay/viewer/StackViewerOverlay";
export { TrashViewerOverlay } from "./overlay/viewer/TrashViewerOverlay";
