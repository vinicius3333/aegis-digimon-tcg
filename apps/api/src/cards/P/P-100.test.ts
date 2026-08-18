import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-100.js";

describe("P-100 Kuwagamon", () => {
  it("lets the UI choose an opponent Digimon or Tamer and restricts only that permanent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-100", as: "kuwagamon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", suspended: true, as: "digimon" },
            { card: "BT8-090", suspended: true, as: "tamer" },
          ],
          deck: ["BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoSelectCards: false },
    );
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const firstTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("kuwagamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("P-100");
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.perm("digimon").permanentId,
      s.perm("tamer").permanentId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("tamer").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend"));

    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    expect(mainPhase.isOpen).toBe(true);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("digimon").isSuspended).toBe(false);

    // The restriction expires at the end of this opponent turn. On their next Active phase,
    // the formerly restricted Tamer can unsuspend normally again.
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const controllerTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    expect(mainPhase.isOpen).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await controllerTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    expect(mainPhase.isOpen).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await nextOpponentTurn;
  });

  it("opens the opponent Digimon-or-Tamer restriction from When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-066", as: "base" }],
          hand: [{ card: "P-100", as: "kuwagamon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", suspended: true, as: "digimon" },
            { card: "BT8-090", suspended: true, as: "tamer" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("kuwagamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("P-100");
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.perm("digimon").permanentId,
      s.perm("tamer").permanentId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("tamer").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend"));

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("kuwagamon").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
  });

  it("grants its inherited host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-078", dp: 10000, as: "host", under: ["P-100"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(12000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(10000);
  });
});
