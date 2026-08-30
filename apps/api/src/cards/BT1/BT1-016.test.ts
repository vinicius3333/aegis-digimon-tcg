import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-016.js";
import "./BT1-020.js";

describe("BT1-016 Tyrannomon", () => {
  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-016", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Jamming")).toBe(true);
  });

  it("is not deleted in battle against a stronger Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "attacker" }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
  });

  it("can still be deleted in battle against a stronger opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-081", as: "defender", suspended: true }] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
  });

  it("does not confer Jamming when Tyrannomon is a digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "host", under: [{ card: "BT1-016", as: "tyrannomon" }] }],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });
});
