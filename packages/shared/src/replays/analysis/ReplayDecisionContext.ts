export const ReplayDecisionContext = {
  MAIN: { name: "MAIN", value: "main", label: "replayAnalysis.context.main" },
  BREEDING: { name: "BREEDING", value: "breeding", label: "replayAnalysis.context.breeding" },
  EFFECT: { name: "EFFECT", value: "effect", label: "replayAnalysis.context.effect" },
  COMBAT: { name: "COMBAT", value: "combat", label: "replayAnalysis.context.combat" },
  MULLIGAN: { name: "MULLIGAN", value: "mulligan", label: "replayAnalysis.context.mulligan" },
} as const;

export type ReplayDecisionContext = (typeof ReplayDecisionContext)[keyof typeof ReplayDecisionContext]["value"];
