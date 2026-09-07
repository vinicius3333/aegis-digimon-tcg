import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_006 } from "./BT25-006.js";
import "../index.js";

describe("BT25-006 Dorimon", () => {
  it("matches the catalog identity and Titan TS traits", () => {
    expect(getCardDefinition("BT25-006")).toMatchObject({
      cardId: "BT25-006",
      nameEn: "Dorimon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      forms: ["In-Training"],
      types: ["Lesser", "X Antibody", "Titan", "TS"],
    });
  });

  it("trashes one hand card when the opponent attacks, then unsuspends one Titan Digimon", () => {
    const effect = BT25_006.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn" });
    expect(effect?.actions?.[0]).toMatchObject({
      event: "whenOpponentAttacks",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          abortOnDecline: true,
          preserveOncePerTurnOnDecline: true,
          allowCostWithoutTarget: true,
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
        },
      ],
    });
    const watcher = effect?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(watcher?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      preserveOncePerTurnOnDecline: true,
      allowCostWithoutTarget: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
        count: 1,
      },
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
    });
  });

  it("trashes one hand card and unsuspends exactly one of your Titan Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-013", as: "titan", suspended: true, under: ["BT25-006", "BT24-009"] },
            { card: "BT24-009", as: "otherTitan", suspended: true, under: ["BT25-006"] },
            { card: "BT1-009", as: "nonTitan", suspended: true },
          ],
          hand: [{ card: "BT25-007", as: "handCost" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT25-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("titan").isSuspended === false);

    expect(s.perm("titan").isSuspended).toBe(false);
    expect(s.perm("otherTitan").isSuspended).toBe(true);
    expect(s.perm("nonTitan").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
  });

  it("keeps a legal egg-to-Titan evolution stack and triggers from its public top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "base", under: ["BT25-006"] }],
          hand: [
            { card: "BT24-013", as: "fugamon" },
            { card: "BT25-007", as: "handCost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fugamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("fugamon").instanceId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT25-006", "BT24-009"]);

    s.perm("base").isSuspended = true;
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").isSuspended === false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
  });

  it("can pay the optional trash condition after a public opponent attack even when no suspended Titan target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-006", as: "dorimon" }],
          hand: [
            { card: "BT10-071", as: "gazimon" },
            { card: "BT25-007", as: "handCost" },
            { card: "BT25-007", as: "secondCost" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-009", as: "secondAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dorimon").permanentId,
        instanceId: s.inst("gazimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dorimon").topCard.instanceId === s.inst("gazimon").instanceId);
    expect(s.perm("dorimon").stack.map((card) => card.cardId)).toEqual(["BT25-006"]);
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));

    expect(s.perm("dorimon").topCard.cardId).toBe("BT10-071");
    expect(s.perm("dorimon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondCost").instanceId);
  });

  it("preserves the once-per-turn opportunity when the optional activation is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-013", as: "titan", suspended: true, under: ["BT25-006", "BT24-009"] }],
          hand: [{ card: "BT25-007", as: "handCost" }],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-010", as: "secondAttacker" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    const firstTrigger = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const firstDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(firstDecision.seat, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    expect(firstTrigger).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("titan").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);

    const secondTrigger = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("secondAttacker").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const secondDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(secondDecision.seat, {
        type: "respondDecision",
        decisionId: secondDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    expect(secondTrigger).toEqual({ ok: true });
    await settle(() => s.perm("titan").isSuspended === false);
    expect(s.perm("titan").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
  });
});
