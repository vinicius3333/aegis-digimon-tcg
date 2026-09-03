import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-015 Gallantmon", () => {
  it("naturally resolves When Digivolving after evolving from level 5", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-011", as: "base" }], hand: [{ card: "BT19-015", as: "gallant" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("mandatorily deletes an eligible opposing Digimon and does not grant the fallback", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-015", as: "gallant" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("gallant"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.perm("gallant").currentDP).toBe(12000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(false);
  });

  it("chooses protected Datamon, then gains Piercing and +3000 DP when deletion fails (Q3071)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-015", as: "gallant" }] },
        1: { battleArea: [{ card: "BT14-062", as: "datamon" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("gallant"));
    expect(s.perm("datamon").topCard?.cardId).toBe("BT14-062");
    expect(s.perm("gallant").currentDP).toBe(15000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(true);
  });

  it("gains 2 memory only once per turn when opposing Digimon are deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-015", as: "gallant" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    expect(s.state.memory).toBe(2);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);
    expect(s.state.memory).toBe(2);
  });
});
