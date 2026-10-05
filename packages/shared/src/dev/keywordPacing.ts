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

/** Defensive and turn-transition cases use public actions on both sides of the field. */
export const KEYWORD_TURN_PACING_SCENARIOS = [
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-blocker-accept" : "keyword-pacing-blocker-decline",
        keyword: "Blocker",
        flow: "block",
        blockerCardId: "ST18-07",
        attackerCardId: "ST1-10",
        securityCardId: "BT1-010",
        accept,
      }) as const,
  ),
  {
    id: "keyword-pacing-reboot",
    keyword: "Reboot",
    flow: "reboot",
    holderCardIds: ["BT4-070", "BT5-069"],
    controlCardId: "BT1-009",
    defenderCardId: "BT1-010",
  },
] as const;

/** Optional protection keeps a real permanent, or exposes its departure and stack cost. */
export const KEYWORD_PROTECTION_PACING_SCENARIOS = [
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-evade-accept" : "keyword-pacing-evade-decline",
        keyword: "Evade",
        flow: "evade",
        attackerCardId: "BT1-020",
        holderCardIds: ["BT14-021"],
        securityCardId: "ST6-15",
        accept,
      }) as const,
  ),
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-armor-purge-accept" : "keyword-pacing-armor-purge-decline",
        keyword: "Armor Purge",
        flow: "armor-purge",
        holderCardIds: ["BT1-009", "BT8-012"],
        defenderCardId: "ST1-10",
        accept,
      }) as const,
  ),
] as const;

/** Stack costs and level reduction are measured one physical card at a time. */
export const KEYWORD_STACK_PACING_SCENARIOS = [
  ...([1, 4] as const).map(
    (amount) =>
      ({
        id: amount === 1 ? "keyword-pacing-de-digivolve-one" : "keyword-pacing-de-digivolve-many",
        keyword: "DeDigivolve",
        flow: "de-digivolve",
        optionCardId: amount === 1 ? "BT2-105" : "BT2-106",
        supportCardId: "BT4-070",
        targetCardIds: ["BT1-001", "BT1-009", "ST1-07", "ST1-08", "ST1-10"],
        removedCount: amount === 1 ? 1 : 3,
        expectedTopCardId: amount === 1 ? "ST1-08" : "BT1-009",
      }) as const,
  ),
  ...([false, true] as const).map(
    (deletesTarget) =>
      ({
        id: deletesTarget ? "keyword-pacing-digi-burst-delete" : "keyword-pacing-digi-burst-reduce",
        keyword: "DigiBurst",
        flow: "digi-burst",
        holderCardIds: ["BT1-006", "ST3-02", "BT1-051", "BT4-046"],
        targetCardId: deletesTarget ? "ST1-04" : "ST1-10",
        deletesTarget,
      }) as const,
  ),
] as const;

export type KeywordStackPacingScenario = (typeof KEYWORD_STACK_PACING_SCENARIOS)[number];

/** Actual On Play draws/recovery; deck identities stay private to their owner. */
export const KEYWORD_DECK_PACING_SCENARIOS = [
  {
    id: "keyword-pacing-draw-one",
    keyword: "Draw",
    flow: "draw",
    sourceSeat: 0,
    sourceCardId: "BT1-029",
    amount: 1,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-draw-many",
    keyword: "Draw",
    flow: "draw",
    sourceSeat: 0,
    sourceCardId: "BT1-041",
    amount: 2,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-draw-opponent",
    keyword: "Draw",
    flow: "draw",
    sourceSeat: 1,
    sourceCardId: "BT1-041",
    amount: 2,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-recovery-one",
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 0,
    sourceCardId: "BT1-060",
    amount: 1,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-recovery-many",
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 0,
    sourceCardId: "BT2-039",
    amount: 2,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-recovery-condition",
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 0,
    sourceCardId: "BT2-039",
    amount: 0,
    initialSecurity: 4,
  },
  {
    id: "keyword-pacing-recovery-opponent",
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 1,
    sourceCardId: "BT1-060",
    amount: 1,
    initialSecurity: 1,
  },
] as const;
export type KeywordDeckPacingScenario = (typeof KEYWORD_DECK_PACING_SCENARIOS)[number];
export type KeywordProtectionPacingScenario = (typeof KEYWORD_PROTECTION_PACING_SCENARIOS)[number];
export type KeywordTurnPacingScenario = (typeof KEYWORD_TURN_PACING_SCENARIOS)[number];
export type KeywordPacingScenarioId =
  | (typeof KEYWORD_PACING_SCENARIOS)[number]["id"]
  | KeywordTurnPacingScenario["id"]
  | KeywordProtectionPacingScenario["id"]
  | KeywordStackPacingScenario["id"]
  | KeywordDeckPacingScenario["id"];
export type KeywordPacingScenario = KeywordPacingBoard & { id: (typeof KEYWORD_PACING_SCENARIOS)[number]["id"] };
