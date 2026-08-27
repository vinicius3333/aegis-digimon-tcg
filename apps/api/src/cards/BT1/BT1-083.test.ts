import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-083.js";

describe("BT1-083 GranKuwagamon", () => {
  it("has Piercing and gets +4000 DP on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-083", as: "digimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
    expect(s.perm("digimon").currentDP).toBe(15000);
  });

  it("keeps Piercing but loses the +4000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-083", as: "digimon" }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
    expect(s.perm("digimon").currentDP).toBe(11000);
  });

  it("uses Piercing after deleting an opposing Digimon in battle and surviving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-083", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "defender", suspended: true }],
        security: ["BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not grant either printed effect while GranKuwagamon is a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-057", as: "host", under: ["BT1-083"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
