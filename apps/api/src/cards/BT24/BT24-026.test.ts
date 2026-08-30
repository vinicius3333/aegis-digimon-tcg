import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-026.js";
import "../index.js";

function primitivesOf(setup: EngineSetup): Primitives {
  return (setup.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT24-026 Hyogamon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-026")).toMatchObject({
      cardId: "BT24-026",
      nameEn: "Hyogamon",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Ice-Snow", "Titan", "TS", "Demon"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
    });
  });

  it("requires the hand-trash cost before granting Jamming and Blocker", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0].cost).toMatchObject({ kind: "trash" });
      expect(actions[0].optional).toBeUndefined();
      expect(actions[0].abortOnDecline).toBe(true);
      expect(actions[1].target.sameTarget).toBe(true);
      expect(actions[1].keyword.keyword).toBe("Blocker");
    }
  });

  it("retains the once-per-turn trash-triggered Titamon digivolution", () => {
    const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const action = inherited.actions[0].actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: true,
      reduceCost: 1,
      optional: true,
    });
    expect(action.into.nameOrTrait).toEqual([
      { tokens: ["Titamon"], match: "name" },
      { tokens: ["Titan"], match: "trait" },
    ]);
    expect(inherited.actions[0].sourceFilter).toEqual({ controller: "mine" });
  });

  it("draws only when each trashed copy activates with 5 or fewer cards in hand (Q5607)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT24-026", as: "first" },
          { card: "BT24-026", as: "second" },
          "BT1-009",
          "BT1-010",
          "BT1-011",
          "BT1-012",
          "BT1-013",
        ],
        deck: ["BT1-014", "BT1-015"],
      },
    });
    await s.ready();

    await primitivesOf(s).trash([s.inst("first").instanceId, s.inst("second").instanceId], { byEffectSeat: 0 });
    await settle(() => s.state.players[0]!.hand.length === 6);

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("pays the hand-trash cost and grants both keywords to the same eligible Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-026", as: "hyogamon" },
            { card: "BT24-042", as: "eligible" },
            { card: "BT1-009", as: "ineligible" },
          ],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("hyogamon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Blocker")).toBe(false);
  });

  it("shares one use between its on-play and when-attacking timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-026", as: "hyogamon" }],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("hyogamon"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("hyogamon"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("only inherited-evolves after its owner's hand is trashed and pays 1 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-026"] }],
          hand: [{ card: "BT1-009", as: "ownCost" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
        1: { hand: [{ card: "BT1-010", as: "opponentCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await primitivesOf(s).trash([s.inst("opponentCost").instanceId], { byEffectSeat: 1 });
    expect(s.perm("host").topCard.cardId).toBe("BT24-072");

    await primitivesOf(s).trash([s.inst("ownCost").instanceId], { byEffectSeat: 0 });
    await settle(() => s.perm("host").topCard.cardId === "P-209");

    expect(s.state.memory).toBe(8);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
  });
});
