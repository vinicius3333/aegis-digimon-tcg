import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-041.js";
import "./index.js";

describe("BT17-041 ShineGreymon: Burst Mode", () => {
  it("has Blast Digivolve and plays a Tamer before reducing an opponent's DP per Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Counter")?.keywords).toEqual([
      { keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
      });
      expect(actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: -5000,
        duration: "forTheTurn",
        scaling: { per: 1, unit: "cards", filter: { controller: "mine", kind: ["Tamer"] } },
      });
    }
  });

  it("gains Security Attack +1 per yellow Tamer suspended by the attack cost", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      cost: {
        kind: "suspend",
        target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 2, upTo: true },
      },
      scaling: { per: 1, usePaidCount: true },
    });
  });

  it("plays a Tamer before scaling the on-play DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "existingTamer" }],
          hand: [
            { card: "BT17-041", as: "burst" },
            { card: "BT12-092", as: "playedTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 20000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const playedTamerId = s.inst("playedTamer").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 10000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedTamerId)).toBe(
      true,
    );
  });

  it("gains one Security Attack for each yellow Tamer suspended when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-041", as: "burst" },
            { card: "BT1-087", as: "firstTamer" },
            { card: "BT12-092", as: "secondTamer" },
          ],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burst").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("burst"), "SecurityAttack") === 2);

    expect(s.perm("firstTamer").isSuspended).toBe(true);
    expect(s.perm("secondTamer").isSuspended).toBe(true);
  });
});
