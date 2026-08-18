import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-01.js";
import "./ST3-11.js";

describe("ST3-01 Tokomon", () => {
  it("gives its host +1000 DP when an opponent is deleted at 0 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-11", under: ["ST3-01"], as: "host" }] }, 1: { battleArea: [{ card: "ST3-02", as: "victim" }], security: ["ST3-02"] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("host").currentDP === 11000);
    expect(s.perm("host").currentDP).toBe(11000);
  });

  it("activates independently for every inherited copy on the same deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST3-11", under: ["ST3-01"], as: "attacker" },
            { card: "ST3-09", under: ["ST3-01"], as: "otherHost" },
          ],
        },
        1: { battleArea: [{ card: "ST3-02", as: "victim" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    const attackerBase = s.perm("attacker").currentDP;
    const otherBase = s.perm("otherHost").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("attacker").currentDP).toBe(attackerBase + 1000);
    expect(s.perm("otherHost").currentDP).toBe(otherBase + 1000);
  });
});
