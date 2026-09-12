import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-183.js";

describe("P-183 Gaiomon", () => {
  it("encodes Reboot, Blocker, and the temporary opponent attack grant", () => {
    const card = runtimeCompiledCard("P-183")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          effectText: "[Start of Your Main Phase] This Digimon attacks.",
          duration: "untilOpponentTurnEnd",
        },
        { kind: "Attack", optional: true, withoutSuspending: false, target: { isSelf: true, count: 1 } },
      ],
    });
  });

  it("trashes the opponent's top security card once per turn when an attack target changes", () => {
    expect(runtimeCompiledCard("P-183")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("exposes Reboot and Blocker on the live Gaiomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-183", as: "gaiomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Blocker")).toBe(true);
  });

  it("trashes the opponent's security when Blocker switches a real attack target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-183", as: "gaiomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("gaiomon").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly digivolves for 5, accepts its own attack, and forces the granted attack next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "base" }],
          hand: [{ card: "P-183", as: "gaiomon" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT10-036", as: "recipient" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "P-183");
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("base"))).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(
      observe(s.engine)
        .customEffectGrants(s.perm("recipient"))
        .some((grant) => grant.token === "[Start of Your Main Phase] This Digimon attacks."),
    ).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("recipient"))).toBe(true);
    expect(s.perm("recipient").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly digivolves for 5 and declines the optional own attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "base" }],
          hand: [{ card: "P-183", as: "gaiomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "recipient" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "P-183");
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional") && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("base"))).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("uses the same Gaiomon once on two target switches, then resets on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-183", as: "gaiomon" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker1", dp: 3000 },
            { card: "BT1-009", as: "attacker2", dp: 3000 },
            { card: "BT1-009", as: "attacker3", dp: 3000 },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const gaiomonId = s.perm("gaiomon").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);

    const attack = async (alias: string, combatNumber: number) => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length >= combatNumber);
      expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: gaiomonId })).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= combatNumber);
    };

    await attack("attacker1", 1);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.perm("gaiomon").isSuspended).toBe(true);

    // The second public attack is still this same turn; unsuspend only reopens the printed
    // Blocker cost, while the Once Per Turn watcher must remain spent.
    await advance(s.engine).verb.unsuspend([gaiomonId]);
    await attack("attacker2", 2);
    expect(s.state.players[1]!.security).toHaveLength(4);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // Reboot's natural opponent unsuspend phase made the same Gaiomon available again. The
    // next turn's accepted attack/block is therefore a real once-per-turn reset proof.
    await attack("attacker3", 3);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
