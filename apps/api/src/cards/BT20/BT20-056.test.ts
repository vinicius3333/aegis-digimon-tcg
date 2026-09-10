import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT20-056.js";
import "./BT20-060.js";
import "../ST1/ST1-15.js";

// A3 for BT20-056 (Alphamon — Black/White Lv.6 Digimon).
//
// [Static] ＜Barrier＞
// [On Play] ＜Recovery +1 (Deck)＞. Then, 1 of your Digimon in the breeding area may
//   digivolve into a level 6 or lower [Chronicle] trait Digimon in hand/trash without cost.
// [When Digivolving] Same as [On Play].
// [All Turns] [Once Per Turn] When security stacks are removed from, 1 of your opponent's
//   Digimon gets -8000 DP for the turn.
//
// FAILS-WHEN-REVERTED: [On Play] triggers Recovery — a card moves from the deck to security.

// BT20-056 = Alphamon (playCost 12, Lv.6)
const ALPHAMON = "BT20-056";
// BT20-010 = Ryudamon (Chronicle Lv.3) — valid breeding-digivolve target
const RYUDAMON = "BT20-010";
// BT1-010 = Agumon — cheap filler
const AGUMON = "BT1-010";

describe("BT20-056 Alphamon — On Play Recovery +1", () => {
  it("compiles Barrier, attack-gated breeding digivolution, and inherited protection", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Barrier",
      raw: "＜Barrier＞",
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "Digivolve",
      condition: { kind: "duringAttack" },
      from: ["hand", "trash"],
      payCost: false,
      target: { targetBreeding: true },
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          condition: { kind: "selfHasName", names: ["Alphamon: Ouryuken"] },
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
    expect(
      compiled.effects.find((effect) => effect.trigger === "AllTurns" && !effect.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "any" },
    });
  });

  it("publishes Alphamon's complete catalog identity and text", () => {
    expect(getCardDefinition(ALPHAMON)).toMatchObject({
      cardId: ALPHAMON,
      nameEn: "Alphamon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 3 },
        { color: "Yellow", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight", "Chronicle"],
    });
    expect(getCardDefinition(ALPHAMON)!.effectText).toContain("＜Recovery +1 (Deck)＞");
    expect(getCardDefinition(ALPHAMON)!.effectText).toContain("level 6 or lower [Chronicle]");
    expect(getCardDefinition(ALPHAMON)!.effectText).toContain(
      "[All Turns] [Once Per Turn] When security stacks are removed",
    );
    expect(getCardDefinition(ALPHAMON)!.inheritedEffectText).toBe(
      "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, if this Digimon is [Alphamon: Ouryuken], by trashing your top security card, it doesn't leave.",
    );
  });
  it("does not use the breeding-area digivolution clause outside an attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: ALPHAMON }, { card: RYUDAMON, as: "candidate" }],
          breeding: { card: RYUDAMON, as: "breeding" },
          deck: [{ card: AGUMON, as: "recovered" }],
          security: [AGUMON],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const alpha = s.state.players[0]!.hand.find((card) => card.cardId === ALPHAMON)!;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: alpha.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(RYUDAMON);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("[On Play] ＜Recovery +1 (Deck)＞ — a card moves from deck to security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: ALPHAMON, as: "alphaInst" }],
          // Seat 0 deck has a card to recover.
          deck: [{ card: AGUMON, as: "recovered" }],
          // Seat 0 security has 2 cards (below the 5-cap, so recovery will add one).
          security: [AGUMON, AGUMON],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const alphaInst = s.inst("alphaInst");

    const initialSecurityCount = p0.security.length;
    s.state.memory = 10;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: alphaInst.instanceId,
    });
    expect(res.ok).toBe(true);

    // After [On Play] resolves, security should have gained 1 card.
    await settle(
      () =>
        p0.security.length === initialSecurityCount + 1 &&
        p0.security.some((card) => card.instanceId === s.inst("recovered").instanceId) &&
        s.state.pendingDecision === undefined,
      600,
    );

    expect(p0.security.length).toBe(initialSecurityCount + 1);
  });

  it("publicly evolves through the black level-5 route and resolves When Digivolving Recovery", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-053", as: "base" }],
        hand: [{ card: ALPHAMON, as: "alphaInst" }],
        deck: [
          { card: AGUMON, as: "drawnByDigivolution" },
          { card: AGUMON, as: "recoveredEvo" },
        ],
        security: [AGUMON, AGUMON],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alphaInst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === ALPHAMON &&
        s.state.players[0]!.security.length === 3 &&
        s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recoveredEvo").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-053"]);
  });

  it("public security checks activate the opponent-Digimon penalty only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ALPHAMON, as: "alphamon" }],
          security: [AGUMON, AGUMON, AGUMON],
          deck: Array.from({ length: 10 }, () => AGUMON),
        },
        1: {
          battleArea: [
            { card: AGUMON, dp: 10000, as: "target" },
            { card: AGUMON, dp: 5000, as: "attacker" },
            { card: AGUMON, dp: 5000, as: "secondAttacker" },
          ],
          security: [AGUMON],
          deck: Array.from({ length: 10 }, () => AGUMON),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(s.perm("target").currentDP).toBe(2000);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publishes Barrier at runtime", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: ALPHAMON, as: "alphamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("alphamon"), "Barrier")).toBe(true);
  });

  it.each([true, false])("uses Barrier only for battle deletion (accept=%s)", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-056", as: "alphamon", suspended: true }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: Array.from({ length: 10 }, () => AGUMON),
        },
        1: {
          battleArea: [{ card: AGUMON, as: "attacker", dp: 25000 }],
          security: [AGUMON],
          deck: Array.from({ length: 10 }, () => AGUMON),
        },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
    );
    const hostId = s.perm("alphamon").permanentId;
    const securityId = s.inst("security").instanceId;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(accept);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === securityId)).toBe(!accept);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === securityId)).toBe(accept);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resets the security-removal penalty after a real opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ALPHAMON, as: "alphamon" }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: Array.from({ length: 10 }, () => AGUMON),
        },
        1: {
          hand: ["BT1-010"],
          battleArea: [
            { card: "BT20-057", dp: 20000, as: "firstAttacker" },
            { card: "BT20-057", dp: 20000, as: "secondAttacker" },
          ],
          deck: Array.from({ length: 10 }, () => AGUMON),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const initialChecks = s.events.filter((event) => event.kind === "securityChecked").length;
    for (const [index, attacker] of ["firstAttacker", "secondAttacker"].entries()) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length >= initialChecks + index + 1 &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );
    }
    expect(s.perm("firstAttacker").currentDP).toBe(12000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("firstAttacker").currentDP).toBe(12000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherits paid leave prevention only for Alphamon: Ouryuken", async () => {
    for (const [host, securityCount, survives] of [
      ["BT20-060", 1, true],
      ["BT20-060", 0, false],
      ["BT20-057", 1, false],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: host, dp: 3000, under: [ALPHAMON], as: "host" }],
            security: Array.from({ length: securityCount }, () => AGUMON),
            deck: Array.from({ length: 10 }, () => AGUMON),
          },
          1: {
            battleArea: [{ card: AGUMON, as: "redSource" }],
            hand: [{ card: "ST1-15", as: "deletionOption" }],
            deck: Array.from({ length: 10 }, () => AGUMON),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletionOption").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[1]!.trash.some((card) => card.cardId === "ST1-15") && s.state.pendingDecision === undefined,
      );
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === host)).toBe(survives);
      expect(s.state.players[0]!.security).toHaveLength(survives ? 0 : securityCount);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });
});
