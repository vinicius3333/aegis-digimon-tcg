import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-01.js";

describe("ST2-01 Tsunomon", () => {
  it("gives its host +1000 DP while battling a source-less opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-03", as: "attacker", dp: 2000, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST2-03", as: "defender", dp: 3000, suspended: true }] },
    });

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("defender").permanentId } })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // Tsunomon's +1000 DP turns the 2000-DP attacker into a 3000-DP tie;
    // the attacker survives the tie while the 3000-DP defender is deleted.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not grant the bonus against a Digimon that has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-03", as: "attacker", dp: 2000, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST2-03", as: "defender", dp: 3000, suspended: true, under: ["ST2-01"] }] },
    });

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("defender").permanentId } })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("gives its host +1000 DP when a source-less opponent attacks that host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-03", as: "defender", dp: 3000, suspended: true, under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "ST2-03", as: "attacker", dp: 3500 }] },
    });

    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The inherited effect raises the defender to 4000, so it wins against the
    // 3500-DP source-less attacker; without the effect the defender would lose.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
