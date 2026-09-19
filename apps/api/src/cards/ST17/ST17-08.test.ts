import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import "../index.js";

describe("ST17-08 MegaGargomon", () => {
  it("uses the alternate Rapidmon evolution route for five memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST17-06", as: "rapidmon" }],
        hand: [{ card: "ST17-08", as: "mega" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rapidmon").permanentId,
        instanceId: s.inst("mega").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rapidmon").topCard.cardId === "ST17-08" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(5);
    expect(s.perm("rapidmon").stack.map((card) => card.cardId)).toEqual(["ST17-06"]);
    expect(s.state.players[0]!.deck.length).toBeGreaterThan(0);
  });

  it("has Blocker and Reboot and suspends and restricts two opposing Digimon/Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-07", as: "base" }],
          hand: [{ card: "ST17-08", as: "mega" }, "BT1-009"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentDigimon" },
            { card: "ST17-10", as: "opponentTamer" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(false);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST17-08" && s.perm("opponentDigimon").isSuspended);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);

    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "digivolve")).toBe(true);
  });

  it("can suspend one pair while restricting a different pair, including Tamer digivolution gates", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-07", as: "base" }], hand: [{ card: "ST17-08", as: "mega" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendedA" },
            { card: "BT1-010", as: "suspendedB" },
            { card: "BT1-085", as: "restrictedA" },
            { card: "BT1-085", as: "restrictedB" },
            { card: "BT1-085", as: "freeTamer" },
          ],
          hand: [{ card: "BT4-011", as: "hybrid" }, "BT1-009"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    for (const ids of [
      [s.perm("suspendedA").permanentId, s.perm("suspendedB").permanentId],
      [s.perm("restrictedA").permanentId, s.perm("restrictedB").permanentId],
      [s.perm("restrictedA").permanentId, s.perm("restrictedB").permanentId],
    ]) {
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const decision = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "chooseTargets", instanceIds: ids },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("base").topCard.cardId === "ST17-08" && s.state.pendingDecision === undefined);
    expect(s.perm("suspendedA").isSuspended).toBe(true);
    expect(s.perm("suspendedB").isSuspended).toBe(true);
    expect(s.perm("restrictedA").isSuspended).toBe(false);
    expect(s.perm("restrictedB").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("restrictedA"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restrictedB"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("freeTamer"), "digivolve")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    s.state.memory = 3;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("restrictedA").permanentId,
        instanceId: s.inst("hybrid").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.perm("restrictedA").stack).toHaveLength(0);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("freeTamer").permanentId,
        instanceId: s.inst("hybrid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("freeTamer").topCard.cardId === "BT4-011");
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("keeps the unsuspend lock latent through opponent-Digimon immunity", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-07", as: "base" }], hand: [{ card: "ST17-08", as: "mega" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "immune", suspended: true }],
          hand: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.restrict(
      s.perm("immune").permanentId,
      "beAffected",
      EffectDuration.UntilOwnerTurnEnd,
      {
        fromSourceKind: ["Digimon"],
      },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST17-08" && s.state.pendingDecision === undefined);
    expect(s.perm("immune").isSuspended).toBe(true);
    // Latent while the immunity holds: stored but not effective.
    expect(
      internalsOf(s.engine).continuous.storedRestrictionCount(s.perm("immune").permanentId, "unsuspend"),
    ).toBeGreaterThan(0);
    expect(internalsOf(s.engine).continuous.restrictionCount(s.perm("immune").permanentId, "unsuspend")).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(internalsOf(s.engine).continuous.restrictionCount(s.perm("immune").permanentId, "beAffected")).toBe(0);
    expect(observe(s.engine).isRestricted(s.perm("immune"), "unsuspend")).toBe(true);
    s.state.memory = 3;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("immune").isSuspended).toBe(true);
    expect(
      internalsOf(s.engine).continuous.restrictionCount(s.perm("immune").permanentId, "unsuspend"),
    ).toBeGreaterThan(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(internalsOf(s.engine).continuous.restrictionCount(s.perm("immune").permanentId, "unsuspend")).toBe(0);
  });

  it("unsuspends itself through the shared once-per-turn When Digivolving/End of Attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-07", as: "base", suspended: true }], hand: [{ card: "ST17-08", as: "mega" }] },
        1: { security: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.perm("base").topCard.cardId === "ST17-08");
    expect(s.perm("base").isSuspended).toBe(false);
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(true);
  });

  it("may refuse the shared unsuspend once, then use it again after the next turn begins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-08", as: "mega" }],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          hand: ["BT1-009"],
          security: ["BT1-090", "BT1-090", "BT1-090"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: false },
    );
    await s.ready();
    s.state.turnSeat = 0;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const refusal = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: refusal.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("mega").isSuspended).toBe(true);
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
    expect(s.perm("mega").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const acceptance = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: acceptance.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("mega").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("Blast Digivolves from hand in a real Counter window without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-07", as: "base" }],
          hand: [{ card: "ST17-08", as: "mega" }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("mega").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "ST17-08" && s.events.some((event) => event.kind === "blockWindowOpened"),
    );
    expect(s.perm("base").topCard?.cardId).toBe("ST17-08");
    expect(s.state.memory).toBe(0);
    expect(s.events.some((event) => event.kind === "counterResolved")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("base").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
