import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-053.js";
import "./index.js";

describe("BT20-053 Grademon", () => {
  it("may play Dorumon or Ryudamon into an empty breeding area on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        breeding: true,
        requiresEmpty: "breedingArea",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: {
          filter: { controller: "mine", nameOrTrait: [{ tokens: ["Dorumon", "Ryudamon"], match: "nameExact" }] },
          count: 1,
        },
      });
    }
  });

  it("grants one own Digimon +5000 DP and immunity during an attack until the opponent's turn ends", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions.find((action) => action.kind === "ModifyDP")).toMatchObject({
        kind: "ModifyDP",
        amount: 5000,
        duration: "untilOpponentTurnEnd",
        condition: { kind: "duringAttack" },
      });
      expect(actions.find((action) => action.kind === "GrantImmunity")).toMatchObject({
        kind: "GrantImmunity",
        immuneFrom: "opponentDigimonEffects",
        duration: "untilOpponentTurnEnd",
        condition: { kind: "duringAttack" },
        target: { sameTarget: true },
      });
    }
  });

  it("can redirect one opposing attack to this Digimon once per opponent turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }],
        },
      ],
    });
  });

  it("plays Dorumon or Ryudamon free into empty breeding on both entry timings", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const rookie = mode === "play" ? "BT20-048" : "BT20-010";
      const s = setupEngine(
        {
          0: {
            ...(mode === "play" ? {} : { battleArea: [{ card: "BT20-051", as: "base" }] }),
            hand: [
              { card: "BT20-053", as: "grademon" },
              { card: rookie, as: "rookie" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 7 : 3;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("grademon").instanceId,
              useAlternateCost: true,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding?.topCard.cardId === rookie);
      expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(rookie);
      expect(s.state.memory).toBe(0);
    }
  });

  it("does not play the optional rookie when the breeding area is occupied", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-053", as: "grademon" },
            { card: "BT20-048", as: "rookie" },
          ],
          breeding: { card: "BT20-003", as: "occupied" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-053") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-003");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rookie").instanceId);
  });

  it("Q4721 grants +5000 DP and Digimon-effect immunity during an opponent attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-047", dp: 2000, as: "ally" },
            { card: "BT20-053", as: "grademon" },
          ],
          breeding: { card: "BT20-048" },
          security: ["BT20-047"],
        },
        1: { battleArea: [{ card: "BT20-047", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("grademon"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.perm("ally").currentDP).toBe(7000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ally"), "beAffected", "Digimon")).toBe(true);
  });

  it("naturally digivolves during an attack, grants +5000, and survives an opponent Digimon effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "host", under: ["BT20-010"] }],
          hand: [{ card: "BT20-053", as: "grademon" }],
        },
        1: {
          battleArea: [{ card: "BT20-010", suspended: true, as: "target" }],
          hand: [{ card: "BT20-033", as: "loader" }],
          security: ["BT20-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").topCard.cardId === "BT20-053" &&
        s.events.some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking(),
    );
    const buffedDP = s.perm("host").currentDP;
    // Printed 7000, two Your Turn inherited +2000 grants, and the attack-time +5000.
    expect(buffedDP).toBe(16000);
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("host"), "beAffected", "Digimon")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const beforeLoaderDP = s.perm("host").currentDP;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("host").currentDP).toBe(beforeLoaderDP);
  });

  it("redirects only the first of two opposing attacks to its inherited host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-056", under: ["BT20-053"], dp: 10000, as: "host" }],
          security: ["BT20-047"],
        },
        1: {
          battleArea: [
            { card: "BT20-047", dp: 1000, as: "first" },
            { card: "BT20-047", dp: 1000, as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("first").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-056")).toBe(true);
  });

  it("resets inherited attack redirection on a later opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-056", under: ["BT20-053"], dp: 10000, as: "host" }],
          security: ["BT20-047", "BT20-047"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-047", dp: 1000, as: "attacker" },
            { card: "BT20-047", dp: 1000, as: "nextAttacker" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const nextAttackerId = s.perm("nextAttacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 2);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: nextAttackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 2);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;
  });
});
