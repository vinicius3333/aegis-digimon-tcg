import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-002.js";

describe("BT11-002 Wanyamon", () => {
  it("draws 1 when its host attacks while a blue Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-028", as: "host", under: ["BT11-002"] },
          "BT1-086",
        ],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT1-009");
  });

  it("does not draw without a blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "host", under: ["BT11-002"] }],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
