import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-012.js";

describe("BT3-012 Aquilamon", () => {
  it("deletes an opposing 2000 DP Digimon when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-015", as: "host", under: ["BT3-012"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-011"] },
    }, { autoSelectCards: true });
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId), 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });
});
