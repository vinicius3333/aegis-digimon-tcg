import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import type { PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-048.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-048", () => {
  it("draws two by trashing a Negamon-text card from hand", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(irNode(action?.cost)?.target?.filter).toMatchObject({
      zone: "hand",
      nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
    });
  });
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));
  it("trashes the Negamon-text payment and draws two cards on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-048", as: "source" }, "BT1-046", "EX9-055"], deck: ["BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(player.trash.map(({ cardId }) => cardId)).toEqual(["EX9-055"]);
    expect(player.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046", "BT1-009", "BT1-010"]);
    expect(player.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("does not draw when the hand has no Negamon-text card to trash", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-048", as: "source" }, "BT1-009"], deck: ["BT1-010", "BT1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(player.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(player.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines the payable trash cost without drawing or moving the candidate", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-048", as: "source" }, "EX9-055"], deck: ["BT1-009", "BT1-010"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-055"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits +1000 DP after legal evolution across both turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-048", as: "host" }],
        hand: [{ card: "BT10-064", as: "evo" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("BT10-064");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-048"]);
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(9000);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(9000);
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
