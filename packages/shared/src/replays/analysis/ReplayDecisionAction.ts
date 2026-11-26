export const ReplayDecisionAction = {
  END_PHASE: { name: "END_PHASE", value: "endPhase", label: "replayAnalysis.action.endPhase" },
  HATCH: { name: "HATCH", value: "hatch", label: "replayAnalysis.action.hatch" },
  MOVE_FROM_BREEDING: {
    name: "MOVE_FROM_BREEDING",
    value: "moveFromBreeding",
    label: "replayAnalysis.action.moveFromBreeding",
  },
  PLAY: { name: "PLAY", value: "play", label: "replayAnalysis.action.play" },
  DIGIVOLVE: { name: "DIGIVOLVE", value: "digivolve", label: "replayAnalysis.action.digivolve" },
  ATTACK_PLAYER: { name: "ATTACK_PLAYER", value: "attackPlayer", label: "replayAnalysis.action.attackPlayer" },
  ATTACK_DIGIMON: { name: "ATTACK_DIGIMON", value: "attackDigimon", label: "replayAnalysis.action.attackDigimon" },
  ACTIVATE: { name: "ACTIVATE", value: "activate", label: "replayAnalysis.action.activate" },
  SPECIAL: { name: "SPECIAL", value: "special", label: "replayAnalysis.action.special" },
  BLOCK: { name: "BLOCK", value: "block", label: "replayAnalysis.action.block" },
  COUNTER: { name: "COUNTER", value: "counter", label: "replayAnalysis.action.counter" },
  ALLY: { name: "ALLY", value: "ally", label: "replayAnalysis.action.ally" },
  ACCEPT: { name: "ACCEPT", value: "accept", label: "replayAnalysis.action.accept" },
  DECLINE: { name: "DECLINE", value: "decline", label: "replayAnalysis.action.decline" },
  CHOOSE: { name: "CHOOSE", value: "choose", label: "replayAnalysis.action.choose" },
  SELECT_CARD: { name: "SELECT_CARD", value: "selectCard", label: "replayAnalysis.action.selectCard" },
  KEEP_HAND: { name: "KEEP_HAND", value: "keepHand", label: "replayAnalysis.action.keepHand" },
  MULLIGAN: { name: "MULLIGAN", value: "mulligan", label: "replayAnalysis.action.mulligan" },
} as const;

export type ReplayDecisionAction = (typeof ReplayDecisionAction)[keyof typeof ReplayDecisionAction]["value"];
