export const ReplayAnalysisTab = {
  SUMMARY: { name: "SUMMARY", value: "summary", label: "replayAnalysis.tab.summary" },
  TIMELINE: { name: "TIMELINE", value: "timeline", label: "replayAnalysis.tab.timeline" },
  DECISIONS: { name: "DECISIONS", value: "decisions", label: "replayAnalysis.tab.decisions" },
  PLAYERS: { name: "PLAYERS", value: "players", label: "replayAnalysis.tab.players" },
} as const;

export type ReplayAnalysisTab = (typeof ReplayAnalysisTab)[keyof typeof ReplayAnalysisTab]["value"];
