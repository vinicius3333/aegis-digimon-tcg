export const ReplayAdvantageSource = {
  BOT: { name: "BOT", value: "bot", label: "replayAnalysis.source.bot", help: "replayAnalysis.swingHelp.bot" },
  HEURISTIC: {
    name: "HEURISTIC",
    value: "heuristic",
    label: "replayAnalysis.source.heuristic",
    help: "replayAnalysis.swingHelp",
  },
} as const;

export type ReplayAdvantageSource = (typeof ReplayAdvantageSource)[keyof typeof ReplayAdvantageSource]["value"];
