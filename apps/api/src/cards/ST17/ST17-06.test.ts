import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-06 Rapidmon", () => {
  it("has Blocker and Armor Purge and gives one opposing Digimon and all Security Digimon -4000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-06", as: "rapidmon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }],
          security: [
            { card: "BT1-009", faceUp: true },
            { card: "BT1-010", faceUp: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("rapidmon").permanentId, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("rapidmon").permanentId, "Armor Purge")).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("rapidmon").permanentId], 0);

    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-07", as: "host", suspended: true, under: ["ST17-06"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("digivolves from a level-3 Terriermon for exactly 3 memory and preserves the physical stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-02", as: "base" }], hand: [{ card: "ST17-06", as: "rapidmon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rapidmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST17-06");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST17-02"]);
  });

  it("rejects an unrelated red level-3 source and a level-4 source for Rapidmon", async () => {
    const wrongName = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "ST17-06", as: "rapidmon" }] },
    });
    wrongName.state.memory = 3;
    await wrongName.ready();
    expect(
      wrongName.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongName.perm("base").permanentId,
        instanceId: wrongName.inst("rapidmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });

    const wrongLevel = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "ST17-06", as: "rapidmon" }] },
    });
    wrongLevel.state.memory = 3;
    await wrongLevel.ready();
    expect(
      wrongLevel.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongLevel.perm("base").permanentId,
        instanceId: wrongLevel.inst("rapidmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("keeps the -4000 effect through the opponent's turn and expires afterward", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-06", as: "rapidmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("rapidmon").permanentId], 0);
    expect(s.perm("target").currentDP).toBe(2000);
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(2000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("consumes the suspension trigger once per turn, then targets again on the next own turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-06", as: "rapidmon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 6000 },
            { card: "BT1-010", as: "second", dp: 6000 },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: false },
    );
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const firstSuspension = advance(s.engine).verb.suspend([s.perm("rapidmon").permanentId], 0);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firstSuspension;
    await settle(() => s.perm("first").currentDP === 2000);
    await advance(s.engine).verb.unsuspend([s.perm("rapidmon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("rapidmon").permanentId], 0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("second").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 0;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("rapidmon").permanentId]);
    const nextSuspension = advance(s.engine).verb.suspend([s.perm("rapidmon").permanentId], 0);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const nextDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: nextDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await nextSuspension;
    await settle(() => s.perm("second").currentDP === 2000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
