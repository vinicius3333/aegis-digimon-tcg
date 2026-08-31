import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-026.js";

describe("BT1-026 Breakdramon", () => {
  it("has Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-026", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
  });

  it("checks security after deleting a weaker opposing Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true }], security: ["BT1-001"] },
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

  it("does not check security when it fails to survive the Digimon battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-025", as: "defender", dp: 12000, suspended: true }], security: ["BT1-001"] },
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

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("retains Piercing after evolving from a red level 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "base" }],
        hand: [{ card: "BT1-026", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);

    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });
});
