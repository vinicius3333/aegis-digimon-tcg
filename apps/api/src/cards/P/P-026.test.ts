import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT9/BT9-109.js";
import "./P-026.js";
import "./P-032.js";

describe("P-026 BlackWarGreymon", () => {
  it("Digi-Bursts exactly 2 sources to unsuspend itself without trashing another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-026", as: "blackWarGreymon", suspended: true, under: ["P-032", "P-010"] },
            { card: "BT1-009", as: "ally" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("blackWarGreymon").topCard.instanceId,
      effectKey: "P-026/digi-burst-2-unsuspend",
    })).toEqual({ ok: true });
    await settle(() => !s.perm("blackWarGreymon").isSuspended);

    expect(s.perm("blackWarGreymon").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("blackWarGreymon"), "Jamming")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) =>
      permanent.permanentId === s.perm("ally").permanentId
    )).toBe(true);
  });

  it("doesn't unsuspend when X Antibody leaves only 1 trashable Digi-Burst source", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "P-026", as: "blackWarGreymon", suspended: true, under: ["BT9-109", "P-010"] },
      ] },
    }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("blackWarGreymon").topCard.instanceId,
      effectKey: "P-026/digi-burst-2-unsuspend",
    })).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("blackWarGreymon").isSuspended).toBe(true);
  });
});
