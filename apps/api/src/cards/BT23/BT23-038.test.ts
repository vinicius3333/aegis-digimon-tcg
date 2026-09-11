import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-038.js";

/**
 * BT23-038 FunBeemon — Lv.3 Green/Black Insectoid/X Antibody/Royal Base/CS Digimon.
 *
 * Printed clauses:
 *   1. [Digivolve] Lv.2 w/[Royal Base]/[CS] trait: Cost 0
 *   2. [Security] [All Turns] All of your [Royal Base] trait Digimon get +1000 DP.
 *   3. [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Royal Base] in its
 *      text and 1 card with the [CS] trait among them to the hand. Return the rest to the
 *      bottom of the deck.
 *   4. Inherited: [All Turns] This Digimon gets +1000 DP.
 *
 * KB coverage: Q5301 ("X in its text" = name, traits, effects, inherited effects, (Rule),
 * and every requirement line). Exercised below with a card that carries [Royal Base] only
 * in its printed effect text (BT19-084 Winr, whose trait is [LIBERATOR]).
 */

/** Digivolution cards, bottom-most first, for a preassembled Lv.4 Royal Base carrier. */
const WASPMON_DP = 4000;

describe("BT23-038 FunBeemon", () => {
  it("matches every catalog field and the complete compiled clause set", () => {
    expect(getCardDefinition("BT23-038")).toMatchObject({
      cardId: "BT23-038",
      nameEn: "FunBeemon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Insectoid", "X Antibody", "Royal Base", "CS"],
      effectText:
        "[Digivolve] Lv.2 w/[Royal Base]/[CS]\u00a0trait: Cost 0 \n\n" +
        "[Security] [All Turns] All of your [Royal Base]\u00a0trait Digimon get +1000 DP.\n" +
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Royal Base]\u00a0in its text " +
        "and 1 card with the [CS]\u00a0trait among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Royal Base", "CS"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isSecurity)).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Royal Base"], match: "text" }] },
          count: 1,
          to: "hand",
        },
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("boosts only its own controller's Royal Base Digimon while face up in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-038", as: "securityFunBeemon", faceUp: true }],
        battleArea: [
          { card: "BT23-043", as: "royalBase" },
          { card: "BT23-041", as: "csOnly" },
        ],
      },
      1: {
        battleArea: [{ card: "BT23-043", as: "opposingRoyalBase" }],
      },
    });
    await s.ready();

    expect(s.inst("securityFunBeemon").faceUp).toBe(true);
    // BT23-043 CannonBeemon prints 8000 DP and carries [Royal Base]; BT23-041 Kabuterimon
    // prints 5000 DP and carries [CS] but NOT [Royal Base].
    expect(s.perm("royalBase").currentDP).toBe(9000);
    expect(s.perm("csOnly").currentDP).toBe(5000);
    expect(s.perm("opposingRoyalBase").currentDP).toBe(8000);
  });

  it("does not boost anything while the same card sits face down in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-038", as: "securityFunBeemon", faceUp: false }],
        battleArea: [{ card: "BT23-043", as: "royalBase" }],
      },
    });
    await s.ready();

    expect(s.inst("securityFunBeemon").faceUp).toBe(false);
    expect(s.perm("royalBase").currentDP).toBe(8000);
  });

  // The aura source leaves security through the public route that really removes it: the
  // opponent attacks the player, the security check battles this 1000-DP Digimon away, and the
  // card lands in the trash.
  it("drops the boost as soon as a security check moves the card to the trash", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT23-038", as: "securityFunBeemon", faceUp: true }],
          battleArea: [{ card: "BT23-043", as: "royalBase" }],
          deck: Array(8).fill("BT1-011"),
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          security: Array(3).fill("BT1-011"),
          deck: Array(8).fill("BT1-012"),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("royalBase").currentDP).toBe(9000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("royalBase").currentDP).toBe(9000);

    const funBeemonId = s.inst("securityFunBeemon").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === funBeemonId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(funBeemonId);
    expect(s.perm("royalBase").currentDP).toBe(8000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the security boost up on both players' turns through the real turn loop", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-038", as: "securityFunBeemon", faceUp: true }],
        battleArea: [{ card: "BT23-043", as: "royalBase" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("royalBase").currentDP).toBe(9000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("royalBase").currentDP).toBe(9000);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("royalBase").currentDP).toBe(9000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("adds a [Royal Base]-in-text card that has no [Royal Base] trait and bottoms the rest in order", async () => {
    // Q5301: "[Royal Base] in its text" reaches printed effect text, not just traits.
    // BT19-084 Winr is a [LIBERATOR] Tamer whose only [Royal Base] mention is in its [Main] effect.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-038", as: "funbeemon" }],
          deck: [
            { card: "BT19-084", as: "royalBaseInText" },
            { card: "BT1-009", as: "restFirst" },
            { card: "BT1-010", as: "restSecond" },
            { card: "BT1-011", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const funbeemonId = s.inst("funbeemon").instanceId;
    const winrId = s.inst("royalBaseInText").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: funbeemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === winrId));

    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.instanceId)).toEqual([winrId]);
    // No [CS] trait card was revealed, so the second slot adds nothing and both leftovers go
    // to the bottom of the deck in their revealed order, under the untouched fourth card.
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);
    expect(player.battleArea.some((permanent) => permanent.topCard?.instanceId === funbeemonId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("spends two distinct physical cards on the two overlapping add slots", async () => {
    // BT23-042 Waspmon satisfies BOTH slots (it carries [Royal Base] and [CS]); BT23-049
    // Monodramon satisfies only [CS]. The Royal Base slot must consume Waspmon and leave
    // Monodramon for the CS slot rather than adding the same physical card twice.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-038", as: "funbeemon" }],
          deck: [
            { card: "BT23-042", as: "bothPools" },
            { card: "BT23-049", as: "csOnly" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const bothId = s.inst("bothPools").instanceId;
    const csId = s.inst("csOnly").instanceId;
    const restId = s.inst("rest").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.instanceId).sort()).toEqual([bothId, csId].sort());
    expect(player.deck.map((card) => card.instanceId)).toEqual([restId]);
  });

  it("adds only one card when a single reveal is the sole match for both slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-038", as: "funbeemon" }],
          deck: [
            { card: "BT23-042", as: "bothPools" },
            { card: "BT1-009", as: "restFirst" },
            { card: "BT1-010", as: "restSecond" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const bothId = s.inst("bothPools").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === bothId));

    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.instanceId)).toEqual([bothId]);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("digivolves for 0 from a Lv.2 [Royal Base] base and still draws the digivolution card", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX11-003", as: "egg" },
        hand: [{ card: "BT23-038", as: "funbeemon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const funbeemonId = s.inst("funbeemon").instanceId;
    const permanentId = s.perm("egg").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: funbeemonId, useAlternateCost: true }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === funbeemonId);

    const breeding = s.state.players[0]!.breeding!;
    expect(breeding.permanentId).toBe(permanentId);
    expect(breeding.topCard?.instanceId).toBe(funbeemonId);
    expect(breeding.stack.map((card) => card.instanceId)).toEqual([eggId]);
    // Printed evo cost from a Lv.2 is 1; the alternate [Royal Base]/[CS] route costs 0.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("still offers the printed Lv.2 cost 1 when the controller does not pick the alternate route", async () => {
    // Both routes match a [Royal Base] Lv.2 base. The engine only takes the 0-cost alternate
    // when the intent asks for it, so the printed Green/Black Lv.2 cost stays reachable.
    const s = setupEngine({
      0: {
        breeding: { card: "EX11-003", as: "egg" },
        hand: [{ card: "BT23-038", as: "funbeemon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("funbeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT23-038");

    expect(s.state.memory).toBe(-1);
  });

  it("digivolves for 0 from a Lv.2 [CS] base of the shared Black color", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-005", as: "egg" },
        hand: [{ card: "BT23-038", as: "funbeemon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const funbeemonId = s.inst("funbeemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: funbeemonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === funbeemonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-005"]);
  });

  it("charges the printed cost 1 from a Lv.2 base that has neither trait", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "egg" },
        hand: [{ card: "BT23-038", as: "funbeemon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const funbeemonId = s.inst("funbeemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: funbeemonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === funbeemonId);

    // BT1-007 Tanemon is Green Lv.2 without [Royal Base]/[CS], so only the printed
    // Green Lv.2 evo cost of 1 applies — the alternate 0-cost route must not match.
    expect(s.state.memory).toBe(-1);
  });

  it("rejects a Lv.3 [Royal Base] base — the alternate route is level gated", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-045", as: "levelThree" }],
        hand: [{ card: "BT23-038", as: "funbeemon" }],
      },
    });
    s.state.memory = 5;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("levelThree").permanentId,
      instanceId: s.inst("funbeemon").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT23-038"]);
  });

  it("carries its inherited +1000 DP into a real battle after a real evolution chain", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX11-003", as: "egg" },
          hand: [
            { card: "BT23-038", as: "funbeemon" },
            { card: "BT23-042", as: "waspmon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-041", as: "defender", dp: 5000, suspended: true }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 5;
    const funbeemonId = s.inst("funbeemon").instanceId;
    const waspmonId = s.inst("waspmon").instanceId;
    const permanentId = s.perm("egg").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: funbeemonId, useAlternateCost: true }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === funbeemonId);

    // The move to the battle area goes through the production Breeding phase, not a phase write.
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("egg").inBreeding).toBe(false);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: waspmonId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard?.instanceId === waspmonId);

    const carrier = s.perm("egg");
    expect(carrier.stack.map((card) => card.cardId)).toEqual(["EX11-003", "BT23-038"]);
    expect(carrier.baseDP).toBe(WASPMON_DP);
    expect(carrier.currentDP).toBe(WASPMON_DP + 1000);

    // 5000 vs 5000: the inherited bonus turns a loss into a mutual deletion.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(
      ["BT23-042", "BT23-038", "EX11-003"].sort(),
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("loses the same battle without BT23-038 in the digivolution stack", async () => {
    // Control for the inherited bonus. BT23-037 Tentomon is a Lv.3 [CS] card, so
    // BT23-042's printed "Lv.3 w/[Royal Base]/[CS] trait" route reaches this stack too.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-042", as: "carrier", under: ["BT23-037"] }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-041", as: "defender", dp: 5000, suspended: true }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.perm("carrier").currentDP).toBe(WASPMON_DP);

    const carrierId = s.perm("carrier").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrierId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === carrierId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
