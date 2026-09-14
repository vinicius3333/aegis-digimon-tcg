import { describe, expect, it } from "vitest";
import { getCardDefinition, type Action, type CompiledCard } from "@aegis/shared";
import { runtimeCompiledCard } from "../../interpreter.js";
import { setupEngine, settle } from "../../../testkit/harness.js";
import type { EffectContext } from "../../EffectContext.js";
import { canAttemptUseOptionWithoutCost, runUseOptionWithoutCost } from "./borrowed.js";
import "../../../../cards/index.js";

const unrestricted = [
  "BT10-039",
  "BT10-041",
  "BT17-035",
  "BT17-038",
  "BT21-062",
  "BT24-085",
  "BT25-041",
  "BT25-073",
  "BT25-083",
  "BT25-085",
  "BT26-006",
  "BT26-012",
  "BT26-026",
  "BT26-032",
  "BT26-033",
  "BT26-049",
  "BT26-053",
  "BT26-070",
  "BT26-074",
  "BT26-090",
  "BT26-104",
  "BT6-017",
  "BT6-112",
  "EX12-013",
  "EX12-027",
  "EX12-041",
  "EX12-043",
  "EX12-050",
  "EX12-066",
  "EX12-067",
  "EX12-068",
  "EX13-005",
  "EX13-012",
  "EX13-014",
  "EX13-043",
  "EX13-045",
  "EX13-058",
  "EX13-061",
  "EX13-064",
  "EX13-072",
  "EX2-060",
  "EX4-030",
  "EX7-013",
  "EX7-059",
  "EX7-073",
  "P-027",
  "P-223",
  "ST22-04",
  "ST22-05",
  "ST22-06",
  "ST22-07",
  "ST23-04",
  "ST23-08",
  "ST24-06",
];
function optionActions(value: unknown): Extract<Action, { kind: "UseOptionWithoutCost" }>[] {
  if (value === null || typeof value !== "object") return [];
  const node = value as { kind?: string };
  return [
    ...(node.kind === "UseOptionWithoutCost" ? [value as Extract<Action, { kind: "UseOptionWithoutCost" }>] : []),
    ...Object.values(value).flatMap(optionActions),
  ];
}

describe("printed Option color scope across registered cards", () => {
  it.each(unrestricted)("%s allows multicolor Options without ignoring their use requirements", (cardId) => {
    const card = runtimeCompiledCard(cardId);
    expect(card).toBeDefined();
    const actions = optionActions(card as CompiledCard);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.filter?.singleColor).not.toBe(true);
      expect(action.filter?.colorCount).not.toBe(1);
    }
    const def = getCardDefinition(cardId)!;
    expect([def.effectText, def.inheritedEffectText, def.optionEffect].join(" ")).not.toMatch(/single.color|1.color/i);
  });
  it.each(["BT19-037", "BT19-040", "BT23-085", "EX8-037"])(
    "%s retains its printed single-color restriction",
    (cardId) => {
      const actions = optionActions(runtimeCompiledCard(cardId));
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions)
        expect(action.filter.singleColor === true || action.filter.colorCount === 1).toBe(true);
    },
  );
});

describe("Glowing Dawn peer Option use", () => {
  it.each(["ST23-04", "ST23-08"])("%s uses a green/black DUAL through Use Req after evolving", async (cardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-049", as: "base" },
            { card: "BT1-087", as: "tamer", under: [{ card: "BT1-009", as: "cost", faceUp: false }] },
          ],
          hand: [
            { card: cardId, as: "evolution" },
            { card: "ST23-09", as: "option" },
          ],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "enemy", dp: 12000 }], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === optionId));
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((c) => c.instanceId)).toContain(s.inst("enemy").instanceId);
  });

  it.each([true, false])(
    "multicolor eligibility still obeys the Option color/Use Req predicate (%s)",
    async (requirementMet) => {
      const card = { instanceId: "option", cardId: "ST23-09" };
      const actions = optionActions(runtimeCompiledCard("BT25-041"));
      const offered: string[] = [];
      const ctx = {
        source: { ownerSeat: 0 },
        trigger: {},
        game: {
          player: () => ({ hand: [card] }),
          definitionOf: () => getCardDefinition(card.cardId)!,
          optionColorRequirementMet: () => requirementMet,
        },
        ask: {
          selectCards: async (_ctx: unknown, options: { candidates: string[] }) => {
            offered.push(...options.candidates);
            return [];
          },
        },
        fx: {},
      } as unknown as EffectContext;
      await runUseOptionWithoutCost(ctx, actions[0]!);
      expect(offered).toEqual(requirementMet ? ["option"] : []);
    },
  );
});

describe("Option eligibility from printed filters and live use requirements", () => {
  it.each([
    [false, true, false, ["mono", "dual", "dual2"]],
    [true, true, false, ["mono"]],
    [false, false, false, []],
    [true, false, false, []],
    [true, false, true, ["mono"]],
    [false, false, true, ["mono", "dual", "dual2"]],
  ] as const)(
    "singleColor=%s, live requirement=%s, explicit waiver=%s",
    async (singleColor, requirementMet, waiveColorRequirement, expected) => {
      const hand = [
        { instanceId: "mono", cardId: "P-236" },
        { instanceId: "dual", cardId: "ST23-09" },
        { instanceId: "dual2", cardId: "BT25-057" },
        { instanceId: "wrongTrait", cardId: "BT11-107" },
        { instanceId: "digimon", cardId: "BT25-032" },
      ];
      const offered: string[] = [];
      const ctx = {
        source: { ownerSeat: 0 },
        trigger: {},
        game: {
          player: () => ({ hand }),
          definitionOf: (c: { cardId: string }) => getCardDefinition(c.cardId)!,
          optionColorRequirementMet: () => requirementMet,
        },
        ask: {
          selectCards: async (_ctx: unknown, options: { candidates: string[] }) => {
            offered.push(...options.candidates);
            return [];
          },
        },
        fx: {},
      } as unknown as EffectContext;
      const action: Extract<Action, { kind: "UseOptionWithoutCost" }> = {
        kind: "UseOptionWithoutCost",
        payCost: false,
        from: ["hand"],
        waiveColorRequirement,
        filter: {
          kind: ["Option"],
          nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
          ...(singleColor ? { singleColor: true } : {}),
        },
      };
      expect(await canAttemptUseOptionWithoutCost(ctx, action)).toBe(expected.length > 0);
      await runUseOptionWithoutCost(ctx, action);
      expect(offered).toEqual(expected);
    },
  );
});
