import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-005 Agumon", () => {
  it("requires the printed hand-trash cost", () => {
    const action = registeredCompiledCards.get("EX12-005")!.effects[0]!.actions[0]!;
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });

  it("trashes a Greymon/VB card from hand and then draws two", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX12-005", { card: "EX12-010", as: "cost" }, "BT1-009"],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw when no qualifying hand card is available for the mandatory cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX12-005", "BT1-009"],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });

  it("gives a host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-010", as: "host", under: ["EX12-005"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("keeps the inherited +2000 grant scoped to the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-010", as: "withInherited", under: ["EX12-005"] },
          { card: "EX12-010", as: "withoutInherited" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("withInherited").currentDP).toBe(7000);
    expect(s.perm("withoutInherited").currentDP).toBe(5000);
  });
});
