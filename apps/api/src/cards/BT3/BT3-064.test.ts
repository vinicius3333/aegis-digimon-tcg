import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-064.js";

describe("BT3-064 TiaLudomon", () => {
  it("De-Digivolves 1 opposing Digimon when its level 7 host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-083", as: "host", under: ["BT3-064"] }] },
        1: {
          battleArea: [{ card: "BT2-020", as: "target", under: ["BT2-013"] }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT2-013", 5000);

    expect(s.perm("target").topCard.cardId).toBe("BT2-013");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
