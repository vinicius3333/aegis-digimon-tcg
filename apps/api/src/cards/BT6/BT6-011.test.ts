import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-011.js";

describe("BT6-011 BaoHuckmon", () => {
  it("deletes a 5000 DP Digimon when attacking while you have Sistermon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-015", under: ["BT6-011"], as: "host" }, "BT6-082", "BT6-082"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 5000, as: "firstTarget" },
            { card: "BT1-010", dp: 5000, as: "secondTarget" },
          ],
          security: ["BT1-010"],
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
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
