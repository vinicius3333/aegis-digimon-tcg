export const ReplayGraphDetail = {
  TURNS: { name: "TURNS", value: "turns", label: "replayAnalysis.graph.turns" },
  ACTIONS: { name: "ACTIONS", value: "actions", label: "replayAnalysis.graph.actions" },
} as const;

export type ReplayGraphDetail = (typeof ReplayGraphDetail)[keyof typeof ReplayGraphDetail]["value"];
