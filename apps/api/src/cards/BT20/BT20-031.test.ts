import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-031.js";
import "./index.js";

describe("BT20-031 Liamon", () => {
  it("reduces one opposing Digimon by 3000 DP for the turn on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -3000,
            duration: "forTheTurn",
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Barrier", raw: "＜Barrier＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["ACCEL"], cost: 2, isAlternate: true }]);
  });

  it("applies the -3000 DP turn modifier on play and when digivolving", async () => {
    const played = setupEngine(
      {
        0: { hand: [{ card: "BT20-031", as: "liamon" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 6000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    played.state.memory = 10;
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("liamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => played.perm("target").currentDP === 3000);

    const evolved = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "base" }],
          hand: [{ card: "BT20-031", as: "liamon" }],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 6000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    evolved.state.memory = 10;
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("base").permanentId,
        instanceId: evolved.inst("liamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolved.perm("target").currentDP === 3000);
    expect(evolved.state.memory).toBe(8);
  });

  it("grants Barrier only from Liamon's inherited position", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-032", as: "host", under: ["BT20-031"] },
          { card: "BT20-031", as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });

  it("targets exactly one opposing Digimon and leaves allied and second opposing Digimon unchanged", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-031", as: "liamon" }], battleArea: [{ card: "BT20-010", dp: 4000, as: "ally" }] },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 6000, as: "firstOpponent" },
            { card: "BT20-011", dp: 5000, as: "secondOpponent" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("firstOpponent").currentDP === 3000);
    expect(s.perm("secondOpponent").currentDP).toBe(5000);
    expect(s.perm("ally").currentDP).toBe(4000);
    expect(s.state.memory).toBe(6);
  });

  it("does not invent a target when the opponent has no Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT20-031", as: "liamon" }] },
      1: { hand: [{ card: "BT20-010", as: "control" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-031"));
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("control").instanceId);
    expect(s.state.memory).toBe(6);
  });

  it("uses the ACCEL alternate route while retaining ordinary color evolution", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-030", as: "accelBase" }], hand: [{ card: "BT20-031", as: "liamon" }] },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("accelBase").permanentId,
        instanceId: legal.inst("liamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("accelBase").topCard.cardId === "BT20-031");
    expect(legal.perm("accelBase").stack.map((card) => card.cardId)).toEqual(["BT20-030"]);
    expect(legal.state.memory).toBe(3);

    const normal = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "nonAccelBase" }], hand: [{ card: "BT20-031", as: "liamon" }] },
    });
    normal.state.memory = 5;
    await normal.ready();
    expect(
      normal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: normal.perm("nonAccelBase").permanentId,
        instanceId: normal.inst("liamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normal.perm("nonAccelBase").topCard.cardId === "BT20-031");
    expect(normal.state.memory).toBe(2);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-027", as: "blueBase" }], hand: [{ card: "BT20-031", as: "liamon" }] },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("blueBase").permanentId,
        instanceId: invalid.inst("liamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.perm("blueBase").topCard.cardId).toBe("BT1-027");
  });
});
