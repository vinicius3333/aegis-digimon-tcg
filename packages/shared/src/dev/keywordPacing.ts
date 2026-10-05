import type { Keyword } from "../effects/ir/keywords.js";

interface KeywordPacingBoard {
  id: `keyword-pacing-${string}`;
  keyword: Keyword;
  attackerCardId: string;
  defenderCardId: string | undefined;
  securityCardId: string;
  target: "permanent" | "player";
  attackerRemains: boolean;
  defenderRemains: boolean;
  securityRemoved: number;
  ownSecurityRemoved?: number;
  allies?: readonly string[];
  decision?: { kind: "Alliance" | "Barrier"; accept: boolean };
}

/** Printed-card boards for real server actions; outcomes are measured, never scripted. */
export const KEYWORD_PACING_SCENARIOS = [
  {
    id: "keyword-pacing-piercing",
    keyword: "Piercing",
    attackerCardId: "BT1-026",
    defenderCardId: "BT1-009",
    securityCardId: "BT1-010",
    target: "permanent",
    attackerRemains: true,
    defenderRemains: false,
    securityRemoved: 1,
  },
  {
    id: "keyword-pacing-jamming",
    keyword: "Jamming",
    attackerCardId: "ST19-07",
    defenderCardId: undefined,
    securityCardId: "BT1-081",
    target: "player",
    attackerRemains: true,
    defenderRemains: false,
    securityRemoved: 1,
  },
  {
    id: "keyword-pacing-retaliation",
    keyword: "Retaliation",
    attackerCardId: "BT19-059",
    defenderCardId: "BT1-025",
    securityCardId: "BT1-010",
    target: "permanent",
    attackerRemains: false,
    defenderRemains: false,
    securityRemoved: 0,
  },
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-alliance-accept" : "keyword-pacing-alliance-decline",
        keyword: "Alliance",
        attackerCardId: "AD1-009",
        defenderCardId: undefined,
        securityCardId: "BT1-010",
        target: "player",
        attackerRemains: true,
        defenderRemains: false,
        securityRemoved: accept ? 2 : 1,
        allies: ["BT1-009", "BT1-010"],
        decision: { kind: "Alliance", accept },
      }) as const,
  ),
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-barrier-accept" : "keyword-pacing-barrier-decline",
        keyword: "Barrier",
        attackerCardId: "BT13-041",
        defenderCardId: "BT1-025",
        securityCardId: "BT1-010",
        target: "permanent",
        attackerRemains: accept,
        defenderRemains: true,
        securityRemoved: 0,
        ownSecurityRemoved: accept ? 1 : 0,
        decision: { kind: "Barrier", accept },
      }) as const,
  ),
] as const satisfies readonly KeywordPacingBoard[];

export type KeywordPacingScenarioId = (typeof KEYWORD_PACING_SCENARIOS)[number]["id"];
export type KeywordPacingScenario = KeywordPacingBoard & { id: KeywordPacingScenarioId };
