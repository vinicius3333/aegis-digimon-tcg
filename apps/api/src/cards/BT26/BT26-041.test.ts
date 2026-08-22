import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-041.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("BT26-041 Hudiemon", () => {
  it("compiles both play windows with security handoff, recovery, and optional suspend", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions).toMatchObject([{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "addTop" }, { kind: "Suspend", optional: true }]);
    expect(compiled.effects[1]?.actions).toEqual(compiled.effects[0]?.actions);
  });
  it("preserves the inherited once-per-turn battle-won memory trigger", () => {
    expect(compiled.effects[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });

  it("publicly moves the top security card to hand, recovers from deck, and may suspend a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-041", as: "hudiemon" }], security: ["AD1-001"], deck: ["AD1-002"] },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-001")).toBe(true);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("AD1-002");
    expect(
      s.state.players.some((player) => player.battleArea.some((permanent) => permanent.isSuspended)),
    ).toBe(true);
  });
});
