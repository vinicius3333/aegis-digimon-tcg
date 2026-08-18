import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-08.js";

describe("ST3-08 MagnaAngemon", () => {
  it("gives an opposing Digimon -1000 DP when its host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-09", under: ["ST3-08"], as: "host" }] }, 1: { battleArea: [{ card: "ST3-03", as: "target" }], security: ["ST3-02"] } }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === before - 1000);
    expect(s.perm("target").currentDP).toBe(before - 1000);
  });

  it("deletes a 1000 DP attack target before battle and ends that attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-09", under: ["ST3-08"], as: "host" }] },
        1: { battleArea: [{ card: "ST3-03", as: "target", dp: 1000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
