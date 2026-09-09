import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX4-017.js";
import "../index.js";

describe("EX4-017 Gaogamon", () => {
  it("has the catalog identity and complete compiled coverage", () => {
    expect(getCardDefinition("EX4-017")).toMatchObject({
      cardId: "EX4-017",
      nameEn: "Gaogamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beast"],
      effectText: "[When Digivolving] Return 1 of your opponent's level 3 Digimon to its owner's hand.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an effect adds cards to your opponent's hand, gain 1 memory.",
    });
    expect(runtimeCompiledCard("EX4-017")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Return",
            target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
            to: "hand",
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenEffectAddsToOpponentHand",
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });

  it("digivolves from a blue level-3 source for 2, returns only an opposing level-3, and preserves source/top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "base" }],
          hand: [{ card: "EX4-017", as: "gaogamon" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT4-010", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-017");

    // The newly evolved EX4-017 is the top card, so its inherited text is not active on itself.
    expect(s.state.memory).toBe(3); // -2 evolution cost; no inherited gain from the top card itself.
    expect(s.perm("base").topCard?.cardId).toBe("EX4-017");
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("gaogamon").instanceId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-030"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT4-010");
  });

  it("rejects a non-blue level-3 route without paying or moving the card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX4-017", as: "gaogamon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("gaogamon").instanceId);
  });

  it("uses the inherited watcher once for multiple public effect additions during your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "host", under: ["EX4-017"] }],
          hand: [
            { card: "EX4-015", as: "first" },
            { card: "EX4-015", as: "second" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.memory).toBe(8); // -3 play cost, +1 inherited trigger.

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 2);
    expect(s.state.memory).toBe(5); // second effect addition is blocked this turn.
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("does not gain memory from an opponent-turn effect addition", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "host", under: ["EX4-017"] }],
        deck: ["BT1-010"],
      },
      1: {
        hand: [{ card: "EX4-015", as: "opponentGaomon" }],
        deck: ["BT1-012"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentGaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-015"));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it("resets the inherited once-per-turn allowance on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "host", under: ["EX4-017"] }],
        hand: [
          { card: "EX4-015", as: "first" },
          { card: "EX4-015", as: "second" },
        ],
        deck: ["BT1-010", "BT1-011", "BT1-013"],
      },
      1: { deck: ["BT1-012", "BT1-013", "BT1-014"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("first").instanceId),
    );
    expect(s.state.memory).toBe(8);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const beforeSecondPlay = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("second").instanceId),
    );
    expect(s.state.memory).toBe(beforeSecondPlay - 2); // -3 play cost and a fresh +1 inherited trigger.

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
