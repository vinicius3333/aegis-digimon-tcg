import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-092.js";

// Fixture vocabulary:
//   BT22-008 Agumon      — Red Lv3 [CS] Digimon: a NON-BLUE colour-waiver source.
//   BT23-006 Huckmon     — Red Lv3 [CS] Digimon: the attacker that arms the ＜Delay＞ clause.
//   BT1-009 Monodramon   — Red Lv3 vanilla Digimon: non-CS attacker and legal security filler.
//   BT1-088 Izzy Izumi   — Tamer whose only ability is a player-activated [Main]: an inert
//                          opposing Tamer for the "1 of their Tamers" target.

const SECURITY_FILLER = ["BT1-009", "BT1-010", "BT1-011"];

describe("BT23-092 Ice Archery", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-092")).toMatchObject({
      cardId: "BT23-092",
      nameEn: "Ice Archery",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
      effectText:
        "While you have a Digimon or Tamer with the [CS]\u00a0trait on the field, you can ignore this card's color requirements.\n" +
        "[Main] Until your opponent's turn ends, 1 of their Digimon and 1 of their Tamers can't suspend. Then, place this card in the battle area.\n" +
        "[Your Turn] When one of your [CS]\u00a0trait Digimon attacks, ＜Delay＞ \n" +
        "・Until your opponent's turn ends, 1 of their Digimon and 1 of their Tamers can't suspend.",
      securityEffectText:
        "[Security] Until your opponent's turn ends, 1 of their Digimon and 1 of their Tamers can't suspend. Then, place this card in the battle area.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    // Clause 1: the waiver is gated on "on the field" (Q5365 — battle area OR breeding),
    // on MY side, on a Digimon or Tamer, matching [CS] as an EXACT trait (CR 2-3-2-3).
    const waiver = compiled.effects.find((effect) => effect.trigger === "Static") as any;
    expect(waiver.actions).toHaveLength(1);
    expect(waiver.actions[0]).toMatchObject({ kind: "WaiveColorRequirement" });
    expect(waiver.actions[0].condition).toMatchObject({
      kind: "youHave",
      filter: {
        zone: ["battleArea", "breeding"],
        controllerDefault: "mine",
        kind: ["Digimon", "Tamer"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
    });

    // Clauses 2 and 4 are the same body; the ＜Delay＞ bullet (clause 3) omits the placement.
    for (const trigger of ["Main", "Security"] as const) {
      const clause = compiled.effects.find((effect) => effect.trigger === trigger) as any;
      expect(clause.actions).toMatchObject([
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          target: { count: 1, filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          target: { count: 1, filter: { controllerDefault: "opponent", kind: ["Tamer"] } },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ]);
    }
    expect((compiled.effects.find((effect) => effect.trigger === "Security") as any).isSecurity).toBe(true);

    const delay = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(delay.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(delay.actions).toHaveLength(1);
    expect(delay.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
    });
    expect(delay.actions[0].actions).toMatchObject([
      { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
      { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
    ]);
    expect(delay.actions[0].actions.some((action: any) => action.kind === "PlaceInBattleAreaSelf")).toBe(false);
  });

  it("[Main]: plays off a non-blue [CS] Digimon, restricts one opposing Digimon and one Tamer, then places itself", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-092", as: "iceArchery" }],
          battleArea: [{ card: "BT22-008", as: "csSource" }],
          security: SECURITY_FILLER,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetDigimon" },
            { card: "BT1-010", as: "otherDigimon" },
            { card: "BT1-088", as: "targetTamer" },
          ],
          security: SECURITY_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("targetDigimon").topCard!.instanceId, s.perm("targetTamer").topCard!.instanceId);
    s.state.memory = 5;
    const optionId = s.inst("iceArchery").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended"));

    // The blue colour requirement was waived by the RED [CS] Agumon.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    // "Then, place this card in the battle area" — not the trash, not the delay zone.
    const optionPermanent = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionId);
    expect(optionPermanent).toBeDefined();
    expect(optionPermanent!.placedByEffect).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.delayZone.some((card) => card.instanceId === optionId)).toBe(false);
    // Exactly ONE of their Digimon, and one of their Tamers.
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("otherDigimon"), "beSuspended")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects the play when no [CS] Digimon or Tamer is on the field and no blue source is out", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT23-092", as: "iceArchery" }],
        battleArea: [{ card: "BT1-009", as: "redNonCs" }],
        security: SECURITY_FILLER,
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "targetDigimon" }],
        security: SECURITY_FILLER,
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceArchery").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(false);
  });

  it("Q5365: a [CS] Digimon in the BREEDING area alone satisfies “on the field”", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-092", as: "iceArchery" }],
          breeding: { card: "BT22-008", as: "csInBreeding" },
          security: SECURITY_FILLER,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetDigimon" },
            { card: "BT1-088", as: "targetTamer" },
          ],
          security: SECURITY_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("iceArchery").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(true);
  });

  it("the restricted Digimon cannot declare an attack, and the restriction expires when the opponent's turn ends", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-092", as: "iceArchery" }, "BT1-009"],
          battleArea: [{ card: "BT22-008", as: "csSource" }],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "restricted" },
            { card: "BT1-010", as: "free", dp: 15000 },
            { card: "BT1-088", as: "targetTamer" },
          ],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("restricted").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceArchery").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("restricted"), "beSuspended"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // The opponent's turn: the Active phase unsuspended everything, yet the restricted
    // Digimon still cannot pay the implicit suspend that starts an attack.
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "beSuspended")).toBe(true);
    expect(s.perm("restricted").isSuspended).toBe(false);
    const blocked = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("restricted").permanentId,
      target: { kind: "player" },
    });
    // combat/legality.ts:206 — "can't suspend" blocks the tapping attack declaration.
    expect(blocked).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("restricted").isSuspended).toBe(false);
    // The unrestricted Digimon on the same board attacks normally.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("free").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("free").isSuspended);
    expect(s.perm("free").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "beSuspended")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // "Until your opponent's turn ends" — gone by my next turn.
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "beSuspended")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Delay＞: inert the turn it is placed, then trashes itself on a later [CS] attack to restrict", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-092", as: "iceArchery" }, "BT1-009"],
          battleArea: [{ card: "BT23-006", as: "csAttacker", dp: 15000 }],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetDigimon" },
            { card: "BT1-088", as: "targetTamer" },
          ],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const optionId = s.inst("iceArchery").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended"));

    // Same turn (§16-17-3): the ＜Delay＞ cannot be activated, so the [CS] attack leaves the
    // Option on the board and the Tamer's [Main] restriction is the only one in force.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // My next turn: the [Main] restriction has expired and the ＜Delay＞ is now live.
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    // Trashing the card IS the activation cost (§16-17-1).
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Delay＞: declining keeps the Option on the board and applies nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-092", as: "iceArchery" }, "BT1-009"],
          battleArea: [{ card: "BT23-006", as: "csAttacker", dp: 15000 }],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetDigimon" },
            { card: "BT1-088", as: "targetTamer" },
          ],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const optionId = s.inst("iceArchery").instanceId;

    // The [Main] body is mandatory, so the Option still lands on the board while every
    // optional prompt is answered "no".
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Delay＞: a non-[CS] attacker never arms it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-092", as: "iceArchery" }, "BT1-009"],
          battleArea: [
            { card: "BT22-008", as: "csSource" },
            { card: "BT1-009", as: "nonCsAttacker", dp: 15000 },
          ],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetDigimon" },
            { card: "BT1-088", as: "targetTamer" },
          ],
          deck: [...SECURITY_FILLER, ...SECURITY_FILLER],
          security: SECURITY_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const optionId = s.inst("iceArchery").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nonCsAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Security]: restricts the attacking player's board and places itself for its owner", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 15000 },
            { card: "BT1-010", as: "targetDigimon" },
            { card: "BT1-088", as: "targetTamer" },
          ],
          deck: SECURITY_FILLER,
          security: SECURITY_FILLER,
        },
        1: {
          security: [{ card: "BT23-092", as: "securityIceArchery" }],
          deck: SECURITY_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("targetDigimon").topCard!.instanceId, s.perm("targetTamer").topCard!.instanceId);
    const optionId = s.inst("securityIceArchery").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    // "Their" is the security card's controller's opponent — the attacking seat 0.
    expect(observe(s.engine).isRestricted(s.perm("targetDigimon"), "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("targetTamer"), "beSuspended")).toBe(true);
    const placed = s.state.players[1]!.battleArea.find((p) => p.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
