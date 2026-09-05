import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-036.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX9-036", () => {
  it("does not reduce an effect-driven WG evolution during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-036", as: "host" }], hand: [{ card: "EX9-040", as: "evo" }], deck: ["BT1-048"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    // Off-turn evolution is effect-driven, not a normal Main-phase player intent.
    await advance(s.engine).verb.digivolveFromInstance(s.perm("host").permanentId, s.inst("evo").instanceId, {
      payCost: true,
    });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-040");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-036"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each(["BT21-003", "BT1-001"])("validates the off-color WG Digi-Egg route from %s", async (egg) => {
    const legal = egg === "BT21-003";
    const s = setupEngine({
      0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "EX9-036", as: "evo" }], deck: ["BT1-048"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("egg").topCard.cardId).toBe(legal ? "EX9-036" : egg);
    expect(s.perm("egg").stack.map(({ cardId }) => cardId)).toEqual(legal ? [egg] : []);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-048"] : ["EX9-036"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("does not reduce WG evolution in breeding (Q4788)", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX9-036", as: "source" }, hand: [{ card: "EX9-040", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-040");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-036"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not reduce a legal non-WG evolution in the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-036", as: "source" }], hand: [{ card: "BT1-071", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("BT1-071");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-036"]);
    expect(s.perm("source").currentDP).toBe(7000);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces by 1 the cost to digivolve this battle-area Digimon into a WG Digimon during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          sourceFilter: { isSelfRef: true },
          into: { nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
          actions: [{ mode: "reduceCost", amount: 1 }],
        },
      ],
    }));
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));

  it("applies the inherited +1000 DP to the host Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-071", as: "host", under: ["EX9-036"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("reduces a legal WG digivolution from this battle-area Digimon by exactly 1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-036", as: "source" }], hand: [{ card: "EX9-040", as: "evo" }], deck: ["BT1-048"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("source").topCard.cardId).toBe("EX9-040");
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
