import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-015.js";
import "../index.js";

describe("EX4-015 Gaomon", () => {
  it("has the official identity and draws one card for each player on play", () => {
    expect(getCardDefinition("EX4-015")).toMatchObject({
      cardId: "EX4-015",
      nameEn: "Gaomon",
      colors: ["Blue"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
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
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-003"]);
  });
  it("inherits memory gain when an effect adds a card to the opponent's hand", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "GainMemory", amount: 1 }] },
      ],
    });
  });

  it("draws one card from both players' decks on play", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010", "BT1-011"], battleArea: [{ card: "EX4-015", as: "gaomon" }] },
      1: { deck: ["BT1-012", "BT1-013"] },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("gaomon"));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("inherits one memory gain when an effect adds to the opponent's hand, once per turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "EX4-015", as: "source" },
          { card: "BT1-030", as: "host", under: ["EX4-015"] },
        ],
      },
      1: { deck: ["BT1-012", "BT1-013"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.memory === 1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.hand).toHaveLength(2);
  });

  it("does not gain inherited memory when the effect adds cards during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [
          { card: "EX4-015", as: "source" },
          { card: "BT1-030", as: "host", under: ["EX4-015"] },
        ],
      },
      1: { deck: ["BT1-012"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });
});
