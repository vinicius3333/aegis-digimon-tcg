import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-011.js";

describe("BT8-011 Cyclonemon", () => {
  it("deletes an opposing 2000-DP-or-lower Digimon when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-011"] }] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target", dp: 2000 }] },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
