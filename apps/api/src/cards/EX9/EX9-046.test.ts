import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-046.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-046", () => {
  it("reveals three and adds a Negamon-text card and Abbadomon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } },
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["Abbadomon"], match: "name" }] } },
      ],
    }));
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));
  it("adds the single matching card and places both nonmatches below an unrevealed anchor", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-046", as: "source" }], deck: ["BT1-009", "EX9-055", "BT1-010", "BT1-048"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => player.hand.some((card) => card.cardId === "EX9-055"));
    await settle();
    expect(player.hand.map(({ cardId }) => cardId)).toEqual(["EX9-055"]);
    expect(player.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-009", "BT1-010"]);
  });

  it("uses distinct reveal candidates for Negamon text and Abbadomon name", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-046", as: "source" }], deck: ["EX9-048", "EX9-057", "BT1-010", "BT1-048"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const player = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(player.hand.map((card) => card.cardId)).toEqual(["EX9-048", "EX9-057"]);
    expect(player.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("returns all nonmatching reveals below the unrevealed anchor", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-046", as: "source" }], deck: ["BT1-009", "BT1-010", "BT1-046", "BT1-048"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-009", "BT1-010", "BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits +1000 DP after legal evolution and retains it across both turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-046", as: "host" }],
        hand: [{ card: "BT10-062", as: "evo" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(1000);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("BT10-062");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-046"]);
    expect(s.state.memory).toBe(4);
    expect(s.perm("host").currentDP).toBe(6000);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
