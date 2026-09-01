import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-048.js";
import "./index.js";

describe("BT22-048 Togemon", () => {
  it("grants Raid and Piercing only with a same-level stack pair", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Raid" },
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
      expect(effect?.actions[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Piercing" },
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
    }
  });

  it("retains the inherited Your Turn +2000 DP", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("pays 2 on a CS base and gains DP, Raid, and Piercing with a repeated level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-044", as: "base" }],
          hand: [
            { card: "BT22-044", as: "sameLevel" },
            { card: "BT22-048", as: "togemon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("base").permanentId, [s.inst("sameLevel").instanceId]);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("togemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").currentDP).toBe(8000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("applies +3000 DP but grants no keywords without Q4901's repeated level", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT22-048", as: "togemon" }] } }, { autoSelectCards: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("togemon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    const togemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT22-048")!;

    expect(togemon.currentDP).toBe(8000);
    expect(observe(s.engine).hasKeyword(togemon, "Raid")).toBe(false);
    expect(observe(s.engine).hasPierce(togemon)).toBe(false);
  });

  it("applies inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-052", under: ["BT22-048"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(14000);
  });
});
