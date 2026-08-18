import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-021.js";

describe("EX3-021 CrysPaledramon", () => {
  it("digivolves normally from a blue level 4 for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "base" }],
        hand: [{ card: "EX3-021", as: "crysPaledramon" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crysPaledramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-021");

    expect(s.state.memory).toBe(0);
  });

  it("Q3393 lets the player trash any 2 non-adjacent sources and exposes friendly UI decisions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "base" }],
        hand: [{ card: "EX3-021", as: "crysPaledramon" }],
        deck: ["BT1-030"],
      },
      1: {
        battleArea: [
          {
            card: "BT1-033",
            under: [
              { card: "BT1-003", as: "bottom" },
              { card: "BT1-029", as: "lowerMiddle" },
              { card: "BT1-030", as: "upperMiddle" },
              { card: "BT1-031", as: "top" },
            ],
            as: "sourceHost",
          },
          { card: "BT1-033", under: ["BT1-003"], as: "otherSourceHost" },
          { card: "BT1-032", as: "emptyTarget" },
          { card: "BT1-032", as: "otherEmptyTarget" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    const resolving = Promise.resolve(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crysPaledramon").instanceId,
      }),
    );
    expect(await resolving).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const hostDecision = s.state.pendingDecision!;
    const hostPayload = JSON.parse(hostDecision.payloadJson) as { candidateInstanceIds: string[] };
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-021");
    expect(hostPayload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("sourceHost").permanentId, s.perm("otherSourceHost").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hostDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("sourceHost").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const sourceDecision = s.state.pendingDecision!;
    const sourcePayload = JSON.parse(sourceDecision.payloadJson) as {
      candidateInstanceIds: string[];
      min: number;
      max: number;
    };
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-021");
    expect(sourcePayload).toMatchObject({ min: 2, max: 2 });
    expect(sourcePayload.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("bottom").instanceId,
        s.inst("lowerMiddle").instanceId,
        s.inst("upperMiddle").instanceId,
        s.inst("top").instanceId,
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sourceDecision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("top").instanceId, s.inst("lowerMiddle").instanceId],
        },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const restrictionDecision = s.state.pendingDecision!;
    const restrictionPayload = JSON.parse(restrictionDecision.payloadJson) as { candidateInstanceIds: string[] };
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-021");
    expect(restrictionPayload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("emptyTarget").permanentId, s.perm("otherEmptyTarget").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: restrictionDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("emptyTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("emptyTarget"), "attack"));

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("top").instanceId, s.inst("lowerMiddle").instanceId]),
    );
    expect(s.perm("sourceHost").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("upperMiddle").instanceId]),
    );
    expect(observe(s.engine).hasRestriction(s.perm("emptyTarget"), "attack")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("emptyTarget"), "block")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("sourceHost"), "attack")).toBe(false);
  });

  it("Dragonkin family: does as much as possible with 1 source, then may restrict that now-empty Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-019", as: "paledramon" }],
          hand: [{ card: "EX3-021", as: "crysPaledramon" }],
          deck: ["BT1-030"],
        },
        1: {
          battleArea: [
            { card: "EX3-020", under: [{ card: "EX3-018", as: "onlySource" }], as: "wingdramon" },
            { card: "EX3-019", as: "emptyPaledramon" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    preferred.push(s.perm("wingdramon").permanentId, s.perm("wingdramon").permanentId);
    await s.ready();

    // Prefer the Wingdramon both as the source host and, after its only source is trashed,
    // as the independently selected restriction target (Q3392 allows same or different).
    const resolving = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("paledramon").permanentId,
      instanceId: s.inst("crysPaledramon").instanceId,
    });
    expect(resolving).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("onlySource").instanceId) &&
        observe(s.engine).hasRestriction(s.perm("wingdramon"), "attack"),
    );

    expect(preferred).toHaveLength(2);
    expect(s.perm("wingdramon").stack).toHaveLength(0);
    expect(observe(s.engine).hasRestriction(s.perm("wingdramon"), "attack")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("wingdramon"), "block")).toBe(true);
  });

  it("still applies the 'then' restriction when no opponent Digimon had sources to trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "base" }],
        hand: [{ card: "EX3-021", as: "crysPaledramon" }],
        deck: ["BT1-030"],
      },
      1: { battleArea: [{ card: "BT1-033", as: "emptyTarget" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crysPaledramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("emptyTarget"), "attack"));

    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(observe(s.engine).hasRestriction(s.perm("emptyTarget"), "block")).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-021")).toHaveLength(0);
  });

  it("enforces both combat prohibitions and clears them only at the opponent-turn-end boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-032", as: "base" },
          { card: "AD1-001", as: "attacker" },
        ],
        hand: [{ card: "EX3-021", as: "crysPaledramon" }],
        deck: ["BT1-030", "BT1-029", "BT1-031", "BT1-028"],
        security: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "ST18-07", as: "restrictedBlocker" }],
        deck: ["BT1-030", "BT1-029", "BT1-031"],
        security: ["BT1-009", "BT1-009"],
      },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const controllerTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crysPaledramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("restrictedBlocker"), "block"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.events.some(({ kind }) => kind === "blockWindowOpened")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await controllerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 0;
    const restrictedTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    expect(observe(s.engine).hasRestriction(s.perm("restrictedBlocker"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("restrictedBlocker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await restrictedTurn;

    expect(observe(s.engine).hasRestriction(s.perm("restrictedBlocker"), "attack")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("restrictedBlocker"), "block")).toBe(false);

    s.state.turnSeat = 0;
    s.state.memory = 0;
    const nextControllerTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await nextControllerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 0;
    const nextOpponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("restrictedBlocker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await nextOpponentTurn;
  });
});
