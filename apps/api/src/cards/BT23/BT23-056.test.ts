import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, settleAcrossTimers, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-056.js";

/** Fixtures, named so each board reads as the rules situation it sets up. */
const CS_TAMER = "BT22-083"; // Yuuko Kamishiro — Tamer with the [CS] trait.
const PLAIN_TAMER = "BT10-092"; // Nene Amano — Black Tamer without the [CS] trait.
const CS_LEVEL_4 = "BT23-041"; // Kabuterimon — Lv.4 with [CS], Green/Yellow: the off-colour alternate route.
const BLACK_LEVEL_4 = "BT10-062"; // Golemon — Black Lv.4 without [CS]: the printed colour route.
const NON_CS_LEVEL_4 = "BT1-037"; // Gorillamon — Blue Lv.4 without [CS]: no legal route.
const WEAK_SECURITY = "BT1-011"; // Agumon Expert Lv.3, 1000 DP — a security body the attacker beats.
const HOST = "BT23-057"; // Gankoomon Lv.6 Black — an inert seeded body carrying BT23-056 as a source.
const IMMUNE_DIGIMON = "ST18-12"; // Zephagamon — gains "unaffected by opponent Digimon effects" when a Digimon unsuspends.
const FILLER = "BT1-009"; // Monodramon Lv.3 — a legal main-deck body for security, deck and board.

describe("BT23-056 WereGarurumon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-056")).toMatchObject({
      cardId: "BT23-056",
      nameEn: "WereGarurumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Beastkin", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("blocks a real attack aimed at its controller", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: FILLER, as: "attacker" }], security: [FILLER] },
      1: { battleArea: [{ card: "BT23-056", as: "were" }], security: [FILLER, FILLER] },
    });
    await s.ready();
    s.state.turnSeat = 0;

    expect(observe(s.engine).hasKeyword(s.perm("were"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.pendingDecision?.kind === "declareBlock");
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("were").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    // The block resolved a battle instead of a security check: 7000 DP beats the 3000 DP
    // attacker, security is untouched, and WereGarurumon survives suspended.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
    expect(s.perm("were").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants the chosen opponent Digimon a forced attack that fires in their own main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CS_TAMER, as: "tamer" },
            { card: FILLER, as: "ally" },
          ],
          hand: [{ card: "BT23-056", as: "were" }, FILLER],
          deck: Array(10).fill(FILLER),
          security: [WEAK_SECURITY, WEAK_SECURITY, WEAK_SECURITY],
        },
        1: { battleArea: [{ card: FILLER, as: "victim" }], deck: Array(10).fill(FILLER), security: [FILLER, FILLER] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("were").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-056"));
    await settle(() => s.state.pendingDecision === undefined);

    // The grant lands on the opponent's Digimon, never on one of the granter's own.
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("victim").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("ally").permanentId)).toHaveLength(0);
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    // WereGarurumon is an eligible blocker; declining keeps the forced attack on the player
    // so the security check is the observable endpoint.
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // "[Start of Your Main Phase] This Digimon attacks": the victim suspended itself and
    // checked one of its controller's opponent's security cards.
    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    // "until their turn ends": the grant is swept at the end of the victim's own turn, so
    // their next main phase passes with no forced attack and no further security check.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("victim").permanentId)).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("victim").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants nothing without a Tamer that carries the [CS] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_TAMER, as: "tamer" }],
          hand: [{ card: "BT23-056", as: "were" }, FILLER],
          deck: Array(10).fill(FILLER),
          security: [WEAK_SECURITY, WEAK_SECURITY, WEAK_SECURITY],
        },
        1: { battleArea: [{ card: FILLER, as: "victim" }], deck: Array(10).fill(FILLER), security: [FILLER, FILLER] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("were").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-056"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("victim").permanentId)).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves off-colour from a Lv.4 [CS] source for 3 and grants from that route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CS_LEVEL_4, as: "base" },
            { card: CS_TAMER, as: "tamer" },
          ],
          hand: [{ card: "BT23-056", as: "were" }],
          deck: [{ card: FILLER, as: "drawn" }, FILLER, FILLER],
        },
        1: { battleArea: [{ card: FILLER, as: "victim" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const sourceInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("were").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("base").topCard?.cardId === "BT23-056");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("victim").permanentId)).toHaveLength(1);
  });

  it("takes the printed Black Lv.4 route for 3 and refuses a Lv.4 with neither colour nor [CS]", async () => {
    const black = setupEngine({
      0: {
        battleArea: [{ card: BLACK_LEVEL_4, as: "base" }],
        hand: [{ card: "BT23-056", as: "were" }],
        deck: [FILLER, FILLER],
      },
    });
    black.state.memory = 3;
    expect(
      black.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: black.perm("base").permanentId,
        instanceId: black.inst("were").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => black.perm("base").topCard?.cardId === "BT23-056" && black.state.memory === 0);
    expect(black.state.memory).toBe(0);
    expect(black.perm("base").topCard?.cardId).toBe("BT23-056");

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: NON_CS_LEVEL_4, as: "base" }],
        hand: [{ card: "BT23-056", as: "were" }],
        deck: [FILLER, FILLER],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("were").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    await settle(() => false, 60);
    expect(illegal.state.memory).toBe(3);
    expect(illegal.perm("base").topCard?.cardId).toBe(NON_CS_LEVEL_4);
  });

  it("de-digivolves once per turn when a real block switches an attack target, and resets next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HOST, as: "host", under: ["BT23-056"] },
            { card: FILLER, as: "second" },
          ],
          hand: [FILLER],
          deck: Array(20).fill(FILLER),
          security: [WEAK_SECURITY, WEAK_SECURITY, WEAK_SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT23-056", as: "blockerOne" },
            { card: "BT23-056", as: "blockerTwo" },
            // The de-digivolve target never enters a battle, so its stack only changes
            // through the inherited clause.
            { card: "BT23-056", as: "stackHolder", under: [FILLER, BLACK_LEVEL_4], suspended: true },
          ],
          hand: [FILLER],
          deck: Array(20).fill(FILLER),
          security: [WEAK_SECURITY, WEAK_SECURITY, WEAK_SECURITY],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("stackHolder").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    /** Attack the player with `attacker`, have seat 1 block with `blocker`, and settle. */
    const attackAndBlock = async (attacker: string, blocker: string): Promise<void> => {
      // Re-pin the de-digivolve choice: the target's top card changes each time it sheds one.
      preferred.length = 0;
      preferred.push(s.perm("stackHolder").topCard!.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "declareBlock");
      expect(
        s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm(blocker).permanentId }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      await settle();
    };

    /** The card ids the de-digivolve target still carries: top card plus digivolution cards. */
    const holderCards = (): string[] => {
      const holder = s.perm("stackHolder");
      return [holder.topCard!.instanceId, ...holder.stack.map((card) => card.instanceId)];
    };
    const inTrash = (instanceId: string): boolean =>
      s.state.players[1]!.trash.some((card) => card.instanceId === instanceId);
    const before = holderCards();
    expect(before).toHaveLength(3);

    // First target switch of seat 0's turn: the inherited clause fires.
    await attackAndBlock("host", "blockerOne");
    const afterFirst = holderCards();
    expect(afterFirst).toHaveLength(2);
    const firstShed = before.filter((id) => !afterFirst.includes(id));
    expect(firstShed).toHaveLength(1);
    expect(inTrash(firstShed[0]!)).toBe(true);

    // Second target switch in the same turn: [Once Per Turn] refuses.
    await attackAndBlock("second", "blockerTwo");
    expect(holderCards()).toEqual(afterFirst);

    // The counter resets on seat 0's next turn, so the same host fires again.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(holderCards()).toEqual(afterFirst);

    await attackAndBlock("host", "blockerTwo");
    const afterReset = holderCards();
    expect(afterReset).toHaveLength(1);
    const secondShed = afterFirst.filter((id) => !afterReset.includes(id));
    expect(secondShed).toHaveLength(1);
    expect(inTrash(secondShed[0]!)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // KB Q5321: the grant may be given to a Digimon that effects don't affect, but the gained
  // effect does not trigger if that Digimon is still unaffected at the trigger timing.
  it("grants onto an unaffected Digimon, which then never triggers the gained attack (Q5321)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_TAMER, as: "tamer" }],
          hand: [{ card: "BT23-056", as: "were" }, FILLER],
          deck: Array(10).fill(FILLER),
          security: [WEAK_SECURITY, WEAK_SECURITY, WEAK_SECURITY],
        },
        1: {
          // Zephagamon: [All Turns] [Once Per Turn] when a Digimon is unsuspended it stops
          // being affected by the opponent's Digimon's effects for the turn. Its own Active
          // phase re-arms that immunity before its main phase opens.
          battleArea: [{ card: IMMUNE_DIGIMON, as: "victim", suspended: true }],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("were").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-056"));
    await settle(() => s.state.pendingDecision === undefined);

    // First half of Q5321: the grant is allowed and installed.
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("victim").permanentId)).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Second half: the immunity is live at the trigger timing, so nothing attacks.
    expect(observe(s.engine).isRestrictedByEffect(s.perm("victim"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("victim").permanentId)).toHaveLength(1);
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
