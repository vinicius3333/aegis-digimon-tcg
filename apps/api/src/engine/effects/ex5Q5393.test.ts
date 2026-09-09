import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("EX5-001 Q5393 stack rotation", () => {
  it("promotes Sunmon before Koh & Sayo's Lv.3 evolution without a retroactive reaction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-007", as: "host", under: ["EX5-001"] }],
          hand: [
            { card: "EX5-064", as: "koh" },
            { card: "BT1-013", as: "evolution" },
            { card: "BT1-014", as: "shouldNotReact" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koh").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-013");

    expect(s.perm("host").topCard?.cardId).toBe("BT1-013");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-007", "EX5-001"]);
    expect(s.perm("koh").isSuspended).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shouldNotReact").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
