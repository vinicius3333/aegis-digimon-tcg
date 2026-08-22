import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-006 Kakamon", () => {
  it("trashes an SW card, draws one, and gains one memory at the start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not draw or gain memory when no SW card is available for the mandatory cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("gives its host +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-006", as: "host", under: ["EX12-006"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(2000);
  });

  it("encodes one SW hand-trash cost shared by Draw 1 and Gain Memory 1", () => {
    const effect = registeredCompiledCards.get("EX12-006")!.effects[0]!;
    expect(effect.trigger).toBe("StartOfYourMainPhase");
    expect(effect.actions).toHaveLength(2);
    expect(effect.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      cost: { kind: "trash", target: { count: 1, filter: { controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["SW"] }] } } },
    });
    expect(effect.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectActed" } });
    expect(effect.isInherited).not.toBe(true);
    expect(registeredCompiledCards.get("EX12-006")!.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });
});
