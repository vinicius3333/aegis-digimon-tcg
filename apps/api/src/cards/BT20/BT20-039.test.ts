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
    expect(played.state.memory).toBe(6);

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
    expect(evolved.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-038"]);
  });

  it("does not suspend an allied Digimon or invent a target when the opponent has none", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT20-039", as: "diatrymon" }], battleArea: [{ card: "BT20-010", as: "ally" }] },
      1: { hand: [{ card: "BT20-011", as: "control" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("diatrymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-039"));
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("control").instanceId);
  });

  it("grants inherited Piercing to a stronger host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-041", dp: 6000, under: ["BT20-039"], as: "host" }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "target" }],
        security: ["BT20-001"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "securityChecked") && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("rejects an unrelated color level-3 base for both ordinary and alternate evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "redBase" }], hand: [{ card: "BT20-039", as: "diatrymon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("diatrymon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("diatrymon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("redBase").topCard.cardId).toBe("BT20-010");
  });
});
