import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-084.js";
import "./BT2-041.js";

describe("BT2-041 ShineGreymon", () => {
  it("suspends yellow Tamers and gives -4000 DP for each", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-038", as: "base" },
            { card: "BT1-087", as: "t1" },
            { card: "BT2-087", as: "t2" },
          ],
          hand: [{ card: "BT2-041", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP <= 4000);
    expect(s.perm("t1").isSuspended).toBe(true);
    expect(s.perm("t2").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBeLessThanOrEqual(4000);
  });

  it("Q1014 resolves a separate -4000 DP activation for each Tamer suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-038", as: "base" }, "BT1-087", "BT2-087"],
          hand: [{ card: "BT2-041", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT2-034", as: "firstTarget", dp: 4000 },
            { card: "BT2-033", as: "secondTarget", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== firstDecision.decisionId,
    );
    const secondDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("secondTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT2-034", "BT2-033"]),
    );
  });

  it("suspends only active yellow Tamers and scales only from those newly suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-038", as: "base" },
            { card: "BT1-087", as: "activeYellow" },
            { card: "BT2-087", as: "alreadySuspended", suspended: true },
            { card: "BT1-085", as: "redTamer" },
          ],
          hand: [{ card: "BT2-041", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-020", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 8000);

    expect(s.perm("activeYellow").isSuspended).toBe(true);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    expect(s.perm("redTamer").isSuspended).toBe(false);
    expect(s.perm("target").currentDP).toBe(8000);
  });

  it("Q1015/Q1230 suspends multiple Tamers at one timing for opposing reactions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-038", as: "base" }, "BT1-087", "BT2-087"],
          hand: [{ card: "BT2-041", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT4-085", as: "neoDevimonHost", under: ["BT4-084"] },
            { card: "BT2-020", as: "target", dp: 20000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 12000);

    expect(s.state.memory).toBe(-1);
  });

  it("gets +1000 DP for each Tamer its owner has in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-041", as: "shinegreymon" }, "BT1-087", "BT1-085"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("shinegreymon").currentDP).toBe(s.perm("shinegreymon").baseDP + 2000);
  });

  it("does not get the Tamer DP bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-041", as: "shinegreymon" }, "BT1-087", "BT1-085"] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("shinegreymon").currentDP).toBe(s.perm("shinegreymon").baseDP);
  });
});
