import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { compiled } from "./BT16-020.js";
import "../index.js"; // side-effect: registers cards + the @aegis/shared override

// BT16-020 (GaoGamon, Blue Lv.4) alternate digivolution path:
//   "[Digivolve] Lv.3 w/[Night Claw]/[Light Fang] trait: Cost 2" (documented behavior).
// The alternate path bypasses the printed color requirement: any Lv.3 Digimon carrying the
// [Night Claw] or [Light Fang] trait is a legal base, regardless of color.
//
// Real fixtures from cards.json:
//   BT16-020  GaoGamon — Blue Lv.4 (the evolving card; normal evo cost = Lv.3 Blue : 2)
//   BT16-029  — Lv.3 YELLOW [Light Fang] (off-color: the printed EvoCost path REJECTS it, so
//               ONLY the alternate trait-gated requirement can accept it)
//   BT22-069  — Lv.3 [Night Claw]
//   BT1-009   — Lv.3 Digimon WITHOUT either trait (illegal alternate base)
//   BT22-072  — Lv.4 [Night Claw] (wrong level — illegal alternate base)
const GAOGAMON = "BT16-020";
const LV3_LIGHTFANG_YELLOW = "BT16-029";
const LV3_NIGHTCLAW = "BT22-069";
const LV3_NO_TRAIT = "BT1-009";
const LV4_NIGHTCLAW = "BT22-072";
const ALT_COST = 2;

describe("BT16-020 compiled contract", () => {
  it("draws for both players before either memory condition is evaluated", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Draw", controller: "both", amount: 1 },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 },
              { kind: "selfDigivolutionCountAtLeast", value: 3 },
            ],
          },
        },
      ],
    });
  });

  it("inherits Jamming and carries both alternate traits", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Night Claw", "Light Fang"], cost: 2, isAlternate: true },
    ]);
  });
});

describe("BT16-020 alternate digivolution requirement (cardData matcher)", () => {
  it("matches a Lv.3 [Night Claw] base for cost 2", () => {
    const req = matchingAlternateDigivolutionRequirement(GAOGAMON, LV3_NIGHTCLAW);
    expect(req?.cost).toBe(ALT_COST);
  });

  it("matches a Lv.3 [Light Fang] base for cost 2", () => {
    const req = matchingAlternateDigivolutionRequirement(GAOGAMON, LV3_LIGHTFANG_YELLOW);
    expect(req?.cost).toBe(ALT_COST);
  });

  it("does NOT match a Lv.3 base lacking both traits", () => {
    expect(matchingAlternateDigivolutionRequirement(GAOGAMON, LV3_NO_TRAIT)).toBeUndefined();
  });

  it("does NOT match a Lv.4 [Night Claw] base (wrong level)", () => {
    expect(matchingAlternateDigivolutionRequirement(GAOGAMON, LV4_NIGHTCLAW)).toBeUndefined();
  });
});

describe("BT16-020 [Digivolve] alternate path onto an off-color [Light Fang] base (full engine)", () => {
  // FAILS-WHEN-REVERTED: the base is a Lv.3 YELLOW Digimon; GaoGamon is Blue, so the printed
  // EvoCost path rejects it on color. Only the alternate trait-gated requirement (added in
  // ALTERNATE_DIGIVOLUTION_OVERRIDES) accepts it. Remove the override and the digivolve intent
  // is rejected — GaoGamon never lands and neither player draws.
  it("digivolves at cost 2, fires [When Digivolving] (both draw + gain memory when opp hand >= 8)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: LV3_LIGHTFANG_YELLOW, as: "base", dp: 3000 }],
        hand: [{ card: GAOGAMON, as: "gao" }],
        deck: Array.from({ length: 3 }, () => LV3_NO_TRAIT),
      },
      1: {
        deck: Array.from({ length: 3 }, () => LV3_NO_TRAIT),
        hand: Array.from({ length: 8 }, () => LV3_NO_TRAIT), // opp hand >= 8 → memory gate passes
      },
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    s.state.memory = ALT_COST; // exact alternate cost
    const p0DeckBefore = p0.deck.length;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("gao").instanceId,
      useAlternateCost: true,
    });
    expect(res).toEqual({ ok: true });

    // Settle on the LAST step of the chain (the memory gain) so the [When Digivolving] draws
    // for both players have fully resolved before asserting.
    await settle(() => s.perm("base").topCard?.cardId === GAOGAMON && s.state.memory === 1);

    // GaoGamon stacked onto the off-color base via the alternate requirement.
    expect(s.perm("base").topCard?.cardId).toBe(GAOGAMON);
    expect(s.perm("base").stack.some((c) => c.cardId === LV3_LIGHTFANG_YELLOW)).toBe(true);

    // [When Digivolving] both players drew 1. p0 also drew 1 from the standard digivolve-draw
    // rule (-2 total); the OPPONENT's draw (8 → 9) is purely BT16-020's "both players draw 1".
    expect(p0.deck.length).toBe(p0DeckBefore - 2);
    expect(p1.hand.length).toBe(9);

    // Memory gate passed (opp hand >= 8): +1 memory over the post-payment baseline (paid 2 from 2 → 0).
    expect(s.state.memory).toBe(1);
  });

  it("gains memory from the three-digivolution-card condition when the hand condition fails", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: LV3_LIGHTFANG_YELLOW, as: "base", under: [LV3_NO_TRAIT, LV3_NO_TRAIT] }],
        hand: [{ card: GAOGAMON, as: "gao" }],
        deck: Array.from({ length: 3 }, () => LV3_NO_TRAIT),
      },
      1: { deck: Array.from({ length: 3 }, () => LV3_NO_TRAIT) },
    });
    s.state.memory = ALT_COST;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gao").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === GAOGAMON && s.state.memory === 1);

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });
});
