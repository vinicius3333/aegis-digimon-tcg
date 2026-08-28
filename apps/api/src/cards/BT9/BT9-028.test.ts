import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-028.js";

describe("BT9-028 WereGarurumon (X Antibody)", () => {
  it("matches its catalog, exact-name Q1827 gate, and alternate evolution IR", () => {
    expect(getCardDefinition("BT9-028")).toMatchObject({
      cardId: "BT9-028", nameEn: "WereGarurumon (X Antibody)", colors: ["Blue"], kinds: ["Digimon"],
      level: 5, playCost: 8, dp: 8000, evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"], attributes: ["Vaccine"], types: ["Beastkin", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["WereGarurumon"], cost: 0, isAlternate: true }],
      effects: [{ trigger: "WhenDigivolving", actions: [
        { kind: "Unsuspend" },
        { kind: "Return", to: "hand", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } },
          condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["WereGarurumon", "X Antibody"], match: "nameExact" }] } } },
      ] }],
    });
  });

  it("unsuspends itself and returns an opposing level-4-or-lower Digimon with WereGarurumon in its sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "base", suspended: true }],
          hand: [{ card: "BT9-028", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.hand.some((card) => card.cardId === "BT1-015"));
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("does not treat another X-Antibody-form name as the exact [X Antibody] source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-028", as: "wereX", suspended: true, under: ["BT9-024"] }] },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wereX"));

    expect(s.perm("wereX").isSuspended).toBe(false);
    expect(
      s.state.players[1]?.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(true);
  });
});
