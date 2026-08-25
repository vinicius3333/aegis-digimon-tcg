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
});
