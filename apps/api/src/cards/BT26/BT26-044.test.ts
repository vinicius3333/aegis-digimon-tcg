import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT26-044.js";
import "../index.js";

describe("BT26-044 Lilamon", () => {
  it("exposes the printed level-4 DATA SQUAD evolution", () => {
    expect(digivolutionRequirementsFor("BT26-044")).toContainEqual({
      level: 4,
      traits: ["DATA SQUAD"],
      cost: 3,
      isAlternate: true,
    });
  });
  it("encodes the optional suspend, independent lock, reactive reduced-cost evolution, and leave replacement", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Suspend", optional: true },
        { kind: "Restrict", restriction: "unsuspend" },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [{ kind: "Digivolve", from: ["hand"], costDelta: -1 }],
        },
        { kind: "SubTrigger", event: "whenDigivolutionTrashed" },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
  });

  it("resolves the public On Play suspend and unsuspend lock", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-044", as: "lilamon" }] },
        1: { battleArea: [{ card: "BT1-085", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("locks a different card from the one it suspended (Q7035)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-039", as: "evolving" }],
          hand: [{ card: "BT26-044", as: "lilamon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendTarget" },
            { card: "BT1-085", as: "lockOnly" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolving").permanentId,
        instanceId: s.inst("lilamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("lockOnly").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("lockOnly").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lockOnly"), "unsuspend")).toBe(true);
  });

  it("reacts to an opponent suspension with the reduced-cost DATA SQUAD digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-044", as: "lilamon" }],
          hand: [{ card: "BT26-049", as: "rosemon" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.perm("lilamon").topCard.cardId === "BT26-049");

    expect(s.state.memory).toBe(1);
  });

  it("reacts when an effect trashes a face-down card from under one of its Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-044", as: "lilamon" },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] },
          ],
          hand: [{ card: "BT26-049", as: "rosemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("cost").instanceId], 0);
    await settle(() => s.perm("lilamon").topCard.cardId === "BT26-049");

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("lilamon").topCard.instanceId).toBe(s.inst("rosemon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("trashes the bottom face-down Tamer card to prevent an eligible inherited host from leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-082", as: "dataSquadHost", under: ["BT26-044"] },
            {
              card: "BT1-085",
              as: "tamer",
              under: [{ card: "BT1-001", as: "cost", faceUp: false }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("dataSquadHost").permanentId], "byEffect")).toBe(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("dataSquadHost").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });
});
