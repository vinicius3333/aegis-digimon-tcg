import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX4-015.js";
import "../index.js";

describe("EX4-015 Gaomon", () => {
  it("has the official identity and complete compiled coverage", () => {
    expect(getCardDefinition("EX4-015")).toMatchObject({
      cardId: "EX4-015",
      nameEn: "Gaomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast"],
      effectText: "[On Play] Both players draw the top card of their decks.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an effect adds cards to your opponent's hand, gain 1 memory.",
    });
    expect(runtimeCompiledCard("EX4-015")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          { kind: "Draw", amount: 1, controller: "mine" },
          { kind: "Draw", amount: 1, controller: "opponent" },
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

  it("digivolves from a blue level-2 Digi-Egg for 0 and preserves the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-003", as: "base" }],
        hand: [{ card: "EX4-015", as: "gaomon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-015");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("EX4-015");
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("gaomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-003"]);
  });

  it("rejects a non-blue level-3 source without paying or moving cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX4-015", as: "gaomon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("gaomon").instanceId);
  });

  it("draws the top card from both decks through a public play", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        hand: [{ card: "EX4-015", as: "gaomon" }],
      },
      1: { deck: ["BT1-012", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("gaomon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-012"]);
  });

  it("gains memory once for multiple effect additions during its turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-015", as: "base" }],
          hand: [
            { card: "EX4-017", as: "host" },
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

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-017");
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX4-015"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("first").instanceId),
    );
    expect(s.state.memory).toBe(6); // -3 play cost, +1 inherited memory.

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("second").instanceId),
    );
    expect(s.state.memory).toBe(3); // The second effect addition is blocked this turn.
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.hand).toHaveLength(2);
  });

  it("does not gain inherited memory from an opponent-turn play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-017", as: "host", under: ["EX4-015"] }],
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
    await settle(() =>
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("opponentGaomon").instanceId),
    );

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("resets the inherited once-per-turn allowance on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-015", as: "base" }],
        hand: [
          { card: "EX4-017", as: "host" },
          { card: "EX4-015", as: "first" },
          { card: "EX4-015", as: "second" },
        ],
        deck: Array.from({ length: 10 }, () => "BT1-009"),
      },
      1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-017");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX4-015"]);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("first").instanceId),
    );
    expect(s.state.memory).toBe(6);
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
    expect(s.state.memory).toBe(beforeSecondPlay - 2); // -3 cost and a fresh +1 inherited trigger.

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
