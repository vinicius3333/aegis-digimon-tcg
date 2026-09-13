import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-05 Gargomon", () => {
  it("grants one of your Digimon Jamming when it becomes suspended on your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-05", as: "gargomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gargomon").permanentId], 0);
    await settle(() => observe(s.engine).hasKeyword(s.perm("gargomon").permanentId, "Jamming"));

    expect(observe(s.engine).hasKeyword(s.perm("gargomon").permanentId, "Jamming")).toBe(true);
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-07", as: "host", suspended: true, under: ["ST17-05"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("digivolves from a level-3 Terriermon for exactly 2 memory and preserves the physical stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-02", as: "base" }], hand: [{ card: "ST17-05", as: "gargomon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST17-05");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST17-02"]);
  });

  it("rejects a level-3 source without Terriermon or Lopmon in its name and a level-4 source", async () => {
    const wrongName = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "ST17-05", as: "gargomon" }] },
    });
    wrongName.state.memory = 2;
    await wrongName.ready();
    expect(
      wrongName.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongName.perm("base").permanentId,
        instanceId: wrongName.inst("gargomon").instanceId,
      }),
    ).toMatchObject({ ok: false });

    const wrongLevel = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "ST17-05", as: "gargomon" }] },
    });
    wrongLevel.state.memory = 2;
    await wrongLevel.ready();
    expect(
      wrongLevel.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongLevel.perm("base").permanentId,
        instanceId: wrongLevel.inst("gargomon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("does not grant Jamming twice from two suspensions in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-05", as: "gargomon" },
            { card: "ST17-02", as: "first" },
            { card: "ST17-03", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("gargomon").permanentId], 0);
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("first").permanentId, "Jamming") ||
        observe(s.engine).hasKeyword(s.perm("gargomon").permanentId, "Jamming"),
    );
    const firstTarget = observe(s.engine).hasKeyword(s.perm("first").permanentId, "Jamming") ? "first" : "gargomon";
    await advance(s.engine).verb.unsuspend([s.perm("gargomon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("gargomon").permanentId], 0);
    expect(observe(s.engine).hasKeyword(s.perm("second").permanentId, "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm(firstTarget).permanentId, "Jamming")).toBe(true);
  });

  it("expires Jamming at own turn end and grants it again after the next own turn begins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-05", as: "gargomon" },
            { card: "ST17-02", as: "first" },
            { card: "ST17-03", as: "second" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { hand: [{ card: "BT1-009" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: false },
    );
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const firstSuspension = advance(s.engine).verb.suspend([s.perm("gargomon").permanentId], 0);
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
    await settle(() => observe(s.engine).hasKeyword(s.perm("first").permanentId, "Jamming"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    expect(observe(s.engine).hasKeyword(s.perm("first").permanentId, "Jamming")).toBe(false);
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
    await advance(s.engine).verb.unsuspend([s.perm("gargomon").permanentId]);
    const nextSuspension = advance(s.engine).verb.suspend([s.perm("gargomon").permanentId], 0);
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
    await settle(() => observe(s.engine).hasKeyword(s.perm("second").permanentId, "Jamming"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
