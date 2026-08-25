import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-039.js";
import "./index.js";

describe("BT20-039 Diatrymon", () => {
  it("suspends one opposing Digimon on both entry triggers and inherits Piercing", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Piercing", raw: "＜Piercing＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["ACCEL"], cost: 2, isAlternate: true }]);
  });

  it("suspends exactly one opposing Digimon on play and on ACCEL evolution", async () => {
    const played = setupEngine(
      {
        0: { hand: [{ card: "BT20-039", as: "diatrymon" }] },
        1: {
          battleArea: [
            { card: "BT20-010", as: "chosen" },
            { card: "BT20-011", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    played.state.memory = 10;
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("diatrymon").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => played.perm("chosen").isSuspended);
    expect(played.perm("other").isSuspended).toBe(false);

    const evolved = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-038", as: "base" }],
          hand: [{ card: "BT20-039", as: "diatrymon" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    evolved.state.memory = 3;
    await evolved.ready();
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("base").permanentId,
        instanceId: evolved.inst("diatrymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolved.perm("target").isSuspended);
    expect(evolved.state.memory).toBe(2);
  });

  it("grants inherited Piercing to a stronger host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-041", dp: 6000, under: ["BT20-039"], as: "host" }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "target" }],
        security: ["BT20-001"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);
  });
});
