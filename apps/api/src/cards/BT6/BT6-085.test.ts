import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-085.js";

describe("BT6-085 Eosmon", () => {
  it("gives its host +1000 DP during its owner's turn as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-086", under: ["BT6-085"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("plays a level 5 Eosmon from hand without cost when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-085", as: "attacker" }], hand: [{ card: "BT6-085", as: "played" }] },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(0);
  });
});
