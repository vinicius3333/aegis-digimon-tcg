import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-038.js";

describe("EX12-038 Kokuwamon", () => {
  it("does not allow Draw 2 without paying the mandatory trash cost", () => {
    const action = registeredCompiledCards.get("EX12-038")!.effects[0]!.actions[0]!;
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });

  it("trashes the required hand card and draws two on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-038", as: "source" }],
          hand: [{ card: "EX12-037", as: "cost" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("applies the inherited DP reduction once per turn when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "source", under: ["EX12-038"] }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 3000, 100);

    expect(s.perm("opponent").currentDP).toBe(3000);
    expect(registeredCompiledCards.get("EX12-038")!.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });
});
