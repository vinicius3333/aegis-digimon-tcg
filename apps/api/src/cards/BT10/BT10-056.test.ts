import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-056.js";

describe("BT10-056 Lotosmon", () => {
  it("binds the chosen opponent and prevents only it from unsuspending through the next opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "base" }],
          hand: [{ card: "BT10-056", as: "evolving" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "chosen" },
            { card: "BT1-028", as: "other" },
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

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT10-056");
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("chosen").permanentId, s.perm("other").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("chosen").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "unsuspend"));

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "unsuspend")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const controllerTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await controllerTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await nextOpponentTurn;
    assertNoLoudGap(s);
  });

  it("keeps the Plant grant through simultaneous deletion and resolves its mandatory trash choice", async () => {
    const recipientDefinition = getCardDefinition("BT10-043")!;
    const originalTypes = recipientDefinition.types;
    (recipientDefinition as { types?: string[] }).types = ["Plant"];

    try {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT10-056", as: "lotosmon" },
              { card: "BT10-043", as: "plant" },
              { card: "BT1-009", as: "unrelated" },
            ],
            trash: [
              { card: "BT1-064", as: "chosenReturn" },
              { card: "BT1-045", as: "otherEligible" },
              { card: "BT1-078", as: "tooLarge" },
            ],
          },
        },
        { autoSelectCards: false },
      );
      s.state.turnSeat = 1;
      s.state.memory = 0;
      await s.engine.recomputeContinuousEffects();

      const deletion = advance(s.engine).verb.deletePermanent(
        [s.perm("lotosmon").permanentId, s.perm("plant").permanentId, s.perm("unrelated").permanentId],
        "byEffect",
      );
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const decision = s.decisions.at(-1)!.req;
      expect(decision.sourceCardId).toBe("BT10-043");
      expect(decision.options?.candidateInstanceIds).toEqual(
        expect.arrayContaining([s.inst("chosenReturn").instanceId, s.inst("otherEligible").instanceId]),
      );
      expect(decision.options?.candidateInstanceIds).not.toContain(s.inst("tooLarge").instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: {
            kind: "selectCards",
            instanceIds: [s.inst("chosenReturn").instanceId],
          },
        }),
      ).toEqual({ ok: true });
      expect(await deletion).toBe(3);

      expect(s.state.memory).toBe(-2);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chosenReturn").instanceId)).toBe(true);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("otherEligible").instanceId)).toBe(
        true,
      );
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tooLarge").instanceId)).toBe(true);
      assertNoLoudGap(s);
    } finally {
      (recipientDefinition as { types?: string[] }).types = originalTypes as string[] | undefined;
    }
  });
});
