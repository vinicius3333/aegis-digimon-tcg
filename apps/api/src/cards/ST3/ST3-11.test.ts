import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-11.js";

describe("ST3-11 Seraphimon", () => {
  it("gives an opposing Digimon -4000 DP when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-11", as: "seraphimon" }] }, 1: { battleArea: [{ card: "ST3-07", as: "target" }], security: ["ST3-02"] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("seraphimon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("deletes a 4000 DP attack target before battle and survives", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-11", as: "seraphimon" }] },
        1: { battleArea: [{ card: "ST3-07", as: "target", dp: 4000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seraphimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
