export const ReplayEvaluationFactor = {
  SECURITY: { name: "SECURITY", value: "security", label: "replayAnalysis.factor.security" },
  HAND: { name: "HAND", value: "hand", label: "replayAnalysis.factor.hand" },
  BOARD: { name: "BOARD", value: "board", label: "replayAnalysis.factor.board" },
  DEFENSE: { name: "DEFENSE", value: "defense", label: "replayAnalysis.factor.defense" },
  ATTACK: { name: "ATTACK", value: "attack", label: "replayAnalysis.factor.attack" },
  DECK: { name: "DECK", value: "deck", label: "replayAnalysis.factor.deck" },
  MEMORY: { name: "MEMORY", value: "memory", label: "replayAnalysis.factor.memory" },
} as const;

export type ReplayEvaluationFactor = (typeof ReplayEvaluationFactor)[keyof typeof ReplayEvaluationFactor]["value"];
