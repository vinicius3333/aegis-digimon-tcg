import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT6/BT6-084.js";
import "../BT6/BT6-015.js";
import "./ST12-10.js";
import "./ST12-12.js";
import "../index.js"; // the full catalog is registered in a real match

describe("ST12-10 Jesmon", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-08", as: "base" }], hand: [{ card: "ST12-10", as: "evolving" }] } }, { autoOrderTriggers: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("plays a Sistermon when attacking and gains +3000 DP and Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-10", as: "jesmon" }], hand: [{ card: "ST12-12", as: "sister" }] }, 1: { security: ["BT1-001", "BT1-002", "BT1-003"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const sisterId = s.inst("sister").instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("jesmon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sisterId) && s.perm("jesmon").currentDP === 15000 && observe(s.engine).keywordAmount(s.perm("jesmon"), "SecurityAttack") === 1);
    expect(observe(s.engine).keywordAmount(s.perm("jesmon"), "SecurityAttack")).toBe(1);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("ends the Main phase after its Blitz attack when memory has crossed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST12-08", as: "jesmon" }],
        hand: [{ card: "ST12-10", as: "evolving" }, { card: "ST12-12", as: "sister" }],
        deck: ["ST12-01"],
      },
      1: { security: ["BT1-001", "BT1-002"], deck: ["ST12-01"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 5000);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("jesmon").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("jesmon").permanentId), 5000);
    expect(s.state.memory).toBe(-1);
    expect(mainPhase.isOpen).toBe(true);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("jesmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    await settle(() => !mainPhase.isOpen, 5000);
    expect(mainPhase.isOpen).toBe(false);
    await turn;
  });

  it("asks once before Blitz and consumes the opportunity after the attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST12-08", as: "jesmon" }],
        hand: [{ card: "ST12-10", as: "evolving" }],
        deck: ["ST12-01"],
      },
      1: { security: ["BT1-001", "BT1-002"], deck: ["ST12-01"] },
    }, { autoOrderTriggers: true });
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("jesmon").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const blitzDecision = s.state.pendingDecision!;
    expect(JSON.parse(blitzDecision.payloadJson)).toMatchObject({ promptKey: "activateBlitz" });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: blitzDecision.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("jesmon").permanentId));

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("jesmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    if (s.state.pendingDecision !== undefined) {
      expect(s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision.decisionId,
        response: { kind: "optional", accept: false },
      })).toEqual({ ok: true });
    }
    await settle(() => !mainPhase.isOpen);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("jesmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: false, reason: "wrong-phase" });
    await turn;
  });

  it("ends the turn when the player declines Blitz", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST12-08", as: "jesmon" }],
        hand: [{ card: "ST12-10", as: "evolving" }],
        deck: ["ST12-01"],
      },
      1: { security: ["BT1-001"], deck: ["ST12-01"] },
    }, { autoOrderTriggers: true });
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("jesmon").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => !mainPhase.isOpen);
    await turn;
  });

  it("does not reopen Blitz when an inherited effect unsuspends Jesmon during that attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-015", as: "jesmonBase" },
          { card: "BT6-082", as: "sistermon" },
        ],
        hand: [{ card: "ST12-10", as: "jesmon" }],
        deck: ["ST12-01"],
      },
      1: { security: ["BT1-001", "BT1-002"], deck: ["ST12-01"] },
    }, {
      autoAcceptOptional: true,
      autoOrderTriggers: true,
      autoSelectCards: true,
    });
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("jesmonBase").permanentId,
      instanceId: s.inst("jesmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("jesmonBase").permanentId));
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("jesmonBase").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    await settle(() => !mainPhase.isOpen);
    expect(s.perm("jesmonBase").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    await turn;
  });

  it("keeps the Main phase open when a Blitz attack restores memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST12-08", as: "jesmon" }, { card: "ST12-03", as: "secondAttacker" }],
        hand: [
          { card: "ST12-10", as: "evolving" },
          { card: "BT6-084", as: "sistermonCiel" },
          { card: "ST12-04", as: "playAfterBlitz" },
        ],
        deck: ["ST12-01"],
      },
      1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"], deck: ["ST12-01"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("jesmon").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.engine.hasAcceptedBlitzAttack(s.perm("jesmon").permanentId));

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("jesmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 0 &&
        !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sistermonCiel").instanceId) &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking &&
        s.state.pendingDecision === undefined,
      5000,
    );

    expect(mainPhase.isOpen).toBe(true);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.turnSeat).toBe(0);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("secondAttacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("playAfterBlitz").instanceId,
    })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("playAfterBlitz").instanceId));
    await turn;
  });
});
