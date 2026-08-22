import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-042.js";

describe("EX12-042 Gatomon", () => {
  it("returns the top security card and recovers one on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-042", as: "source" }],
          security: ["BT1-010"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-009");
  });

  it("can activate and recover from an empty security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-042", as: "source" }],
          security: [],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-009");
  });

  it("shares Once Per Turn between play and attack and carries Blocker/Barrier", () => {
    const compiled = registeredCompiledCards.get("EX12-042")!;
    const effects = compiled.effects.filter((effect) => ["OnPlay", "WhenAttacking"].includes(effect.trigger));
    expect(effects).toHaveLength(2);
    expect(effects.map((effect) => effect.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
    expect(effects[0]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } },
      ],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
    );
  });
});
