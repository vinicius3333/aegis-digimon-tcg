import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-055.js";

describe("P-055 HerculesKabuterimon", () => {
  it("suspends an opponent Digimon with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-055", as: "source" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opponent Digimon without a Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "P-055", as: "source" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("gains 1 memory when it deletes an opponent Digimon in battle and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-055", as: "attacker", dp: 12000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000, suspended: true }] },
    });
    await s.ready();
    s.state.memory = 5;
    const victimId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: victimId } })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    await settle(() => s.state.memory === 6);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId)).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("does not gain memory when another Digimon wins a battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-055", as: "observer" },
          { card: "BT1-009", as: "attacker", dp: 9000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000, suspended: true }] },
    });
    await s.ready();
    s.state.memory = 5;
    const victimId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: victimId } })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    await settle();

    expect(s.state.memory).toBe(5);
  });

  it("does not gain memory when it deletes an opponent in battle but does not survive", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-055", as: "attacker", dp: 12000 }] },
      1: { battleArea: [{ card: "BT1-043", as: "victim", suspended: true, dp: 12000 }] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const victimId = s.perm("victim").permanentId;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "permanent", permanentId: victimId },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId) &&
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)
    );

    expect(s.state.memory).toBe(5);
  });
});
