import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_050 } from "./BT25-050.js";
import "../index.js";

describe("BT25-050 Kiwimon", () => {
  it("suspends a Digimon, then restricts unsuspension once two are suspended", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_050.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Suspend", optional: true });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        condition: {
          kind: "totalDigimonCount",
          filter: { suspended: true, kind: ["Digimon"] },
          op: "gte",
          value: 2,
        },
      });
      expect(effect?.actions?.[1]).not.toHaveProperty("optional");
    }
    const inherited = BT25_050.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: 1000, duration: "permanent" });
  });

  it("requires the unsuspend restriction after suspending a second Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-050", as: "kiwimon" }],
          battleArea: [{ card: "BT1-028", as: "alreadySuspended", suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "opponent" },
            { card: "BT1-028", as: "otherOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kiwimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.decisions.at(-1)!.req;
    expect(suspendDecision.options?.candidateInstanceIds).toContain(s.perm("opponent").permanentId);
    const firstResponse = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: suspendDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("opponent").permanentId],
      },
    });
    expect(firstResponse).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);

    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== suspendDecision.decisionId,
    );
    const restrictDecision = s.decisions.at(-1)!.req;
    expect(restrictDecision.sourceCardId).toBe("BT25-050");
    expect(restrictDecision.options?.candidateInstanceIds).toContain(s.perm("opponent").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: restrictDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("opponent").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent").permanentId, "unsuspend"));
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent").permanentId, "unsuspend")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    expect(s.perm("opponent").isSuspended).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("opponent").permanentId, "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("offers exactly one own-or-opponent Digimon and excludes Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-050", as: "kiwimon" }],
          battleArea: [{ card: "BT1-028", as: "ownDigimon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "opponentDigimon" },
            { card: "BT1-089", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kiwimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("ownDigimon").permanentId, s.perm("opponentDigimon").permanentId]),
    );
    expect(request.options?.candidateInstanceIds).not.toContain(s.perm("opponentTamer").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ownDigimon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ownDigimon").isSuspended);
    expect(s.perm("ownDigimon").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon").permanentId, "unsuspend")).toBe(false);
  });

  it("lets a newly suspended own Digimon satisfy the two-Digimon threshold", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-050", as: "kiwimon" }],
          battleArea: [{ card: "BT1-028", as: "ownDigimon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "alreadySuspended", suspended: true },
            { card: "BT1-028", as: "opponentTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kiwimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspend = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspend.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ownDigimon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ownDigimon").isSuspended);
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.decisionId !== suspend.decisionId,
    );
    const restrict = s.state.pendingDecision!;
    const restrictRequest = s.decisions.at(-1)!.req;
    expect(restrictRequest.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("alreadySuspended").permanentId, s.perm("opponentTarget").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: restrict.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("opponentTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTarget").permanentId, "unsuspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponentTarget").permanentId, "unsuspend")).toBe(true);
  });

  it("resolves the same suspension and threshold sequence after a legal TS digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-047", as: "source", suspended: true }],
          hand: [{ card: "BT25-050", as: "evolver" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "opponent" },
            { card: "BT1-028", as: "otherOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("source").topCard?.cardId === "BT25-050" && s.state.pendingDecision?.kind === "chooseTargets",
    );
    const first = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("opponent").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.decisionId !== first.decisionId,
    );
    const second = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("opponent").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent").permanentId, "unsuspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent").permanentId, "unsuspend")).toBe(true);
  });

  it("supports the public TS alternate evolution from a non-green level 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "source" }], hand: [{ card: "BT25-050", as: "evolver" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-050");
    expect(s.state.memory).toBe(0);
  });

  it("pays the ordinary cost from a non-TS green level 3 and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-064", as: "greenBase" }], hand: [{ card: "BT25-050", as: "evolver" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "alreadySuspended", suspended: true },
            { card: "BT1-028", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("greenBase").topCard?.cardId === "BT25-050" && s.state.pendingDecision?.kind === "chooseTargets",
    );
    const suspend = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspend.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.decisionId !== suspend.decisionId,
    );
    const restrict = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: restrict.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target").permanentId, "unsuspend"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("greenBase").topCard?.cardId).toBe("BT25-050");
    expect(observe(s.engine).isRestricted(s.perm("target").permanentId, "unsuspend")).toBe(true);
  });

  it("rejects the alternate and ordinary routes from a non-TS red source", async () => {
    const wrongTrait = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "source" }], hand: [{ card: "BT25-050", as: "evolver" }] },
    });
    wrongTrait.state.memory = 2;
    await wrongTrait.ready();
    expect(
      wrongTrait.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongTrait.perm("source").permanentId,
        instanceId: wrongTrait.inst("evolver").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "source" }], hand: [{ card: "BT25-050", as: "evolver" }] },
    });
    wrongColor.state.memory = 2;
    await wrongColor.ready();
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("source").permanentId,
        instanceId: wrongColor.inst("evolver").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("does not restrict when the optional suspension is declined and the threshold is unmet", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-050", as: "kiwimon" }] },
        1: { battleArea: [{ card: "BT1-028", as: "opponent", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kiwimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent").permanentId, "unsuspend")).toBe(false);
  });

  it("applies the inherited DP boost to every own Digimon only during its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT25-055", as: "kiwimon", under: ["BT25-048", "BT25-050"] },
          { card: "BT1-028", as: "other" },
        ],
        hand: [{ card: "BT1-028", as: "later" }],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("kiwimon").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(4000);
    expect(s.perm("opponent").currentDP).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("later").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("later").permanentId));
    expect(s.perm("later").currentDP).toBe(4000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("kiwimon").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(3000);
    expect(s.perm("later").currentDP).toBe(3000);
    expect(s.perm("opponent").currentDP).toBe(3000);
  });

  it("does not grant the inherited boost without a Kiwimon source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-028", as: "standalone" }] } });
    await s.ready();
    expect(s.perm("standalone").currentDP).toBe(3000);
  });
});
