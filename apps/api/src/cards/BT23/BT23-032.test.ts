import {
  compiledEffects,
  digivolutionRequirementsFor,
  dnaDigivolutionRequirementsFor,
  EffectDuration,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-032.js";

/**
 * Fixture cards, chosen so each printed branch is isolated.
 *
 * - YELLOW_LV4 / BLACK_LV4 have no printed or inherited effects, so an evolution or a
 *   source play from them adds no noise.
 * - CS_LV4 is green: it can only satisfy the [CS] alternate, never the printed yellow or
 *   black EvoCost.
 * - CS_ONLY_SOURCE is purple level 4 with the [CS] trait and no [On Play], so it proves the
 *   trait branch of the source-play filter without the colour branch.
 * - OFF_POOL_LV4 (red, no [CS]) and OFF_POOL_LV5 (yellow level 5) each fail one half of
 *   "level 4 or lower yellow, black or [CS] trait".
 */
const YELLOW_LV4 = "BT1-051"; // Reppamon
const BLACK_LV4 = "BT10-062"; // Golemon
const CS_LV4 = "BT22-047"; // Kuwagamon, green
const CS_LV3 = "BT23-037"; // Tentomon, level 3
const CS_ONLY_SOURCE = "BT23-063"; // Sangloupmon, purple
const OFF_POOL_LV4 = "AD1-001"; // Greymon, red, no [CS]
const OFF_POOL_LV5 = "BT1-058"; // Chirinmon, yellow level 5
const ANGEMON = "BT23-027"; // Yellow/Blue level 4, carries the only public DNA route
const ANKYLOMON = "BT23-050"; // Black/Yellow level 4
const GARURUMON = "BT23-018"; // Blue level 4
const OPPONENT_LV3 = "BT1-009"; // Monodramon, red — also the colour host for the option below
const OPPONENT_DELETE_OPTION = "BT15-089"; // Meteor Wing: an OPPONENT effect that deletes this Digimon
const HOST_LV6 = "ST3-10"; // Magnadramon, yellow level 6 from a yellow level 5, no effects

describe("BT23-032 Shakkoumon", () => {
  it("declares the official catalog identity, CS alternate and both DNA recipes", () => {
    expect(getCardDefinition("BT23-032")).toMatchObject({
      cardId: "BT23-032",
      nameEn: "Shakkoumon",
      colors: ["Yellow", "Black"],
      level: 5,
      playCost: 8,
      dp: 8000,
      types: ["Mutant", "Hudie", "CS", "Angel"],
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
    });
    expect(digivolutionRequirementsFor("BT23-032")).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(dnaDigivolutionRequirementsFor("BT23-032")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 4 },
          { color: "Black", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 4 },
          { color: "Blue", level: 4 },
        ],
      },
    ]);
    expect(registeredCompiledCards.get("BT23-032")).toEqual(compiled);
    expect(compiledEffects["BT23-032"]).toEqual(compiled);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("models both leave-play replacements as a once-per-turn optional own-stack play", () => {
    const replacements = compiled.effects.filter((effect) => effect.trigger === "AllTurns");
    expect(replacements).toHaveLength(2);
    expect(replacements.map((effect) => effect.isInherited === true)).toEqual([false, true]);
    for (const effect of replacements) {
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.actions[0]).toMatchObject({
        kind: "Replacement",
        event: "wouldLeavePlay",
        leaveCause: "otherThanYourEffect",
        sourceFilter: { isSelfRef: true },
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["digivolutionCards"],
            payCost: false,
            optional: true,
            target: {
              source: "thisDigimon",
              count: 1,
              filter: { colors: ["Yellow", "Black"], levelComparison: { op: "lte", value: 4 } },
              orFilters: [
                {
                  nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                  levelComparison: { op: "lte", value: 4 },
                },
              ],
            },
          },
        ],
      });
    }
  });

  it.each([
    ["yellow", YELLOW_LV4],
    ["black", BLACK_LV4],
  ])("publicly normal-evolves from a level-4 %s source for 4 and draws the evolution bonus", async (_label, base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-046", as: "bonus" }, "BT1-047"],
        },
        1: { battleArea: [{ card: OPPONENT_LV3, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const baseId = s.inst("base").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: shakkoumonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === shakkoumonId);
    await settle();

    expect(s.perm("base").topCard.instanceId).toBe(shakkoumonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly evolves from a level-4 [CS] source for 3 even when its colour is off-recipe", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_LV4, as: "base" }],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-046", as: "bonus" }, "BT1-047"],
        },
        1: { battleArea: [{ card: OPPONENT_LV3, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const baseId = s.inst("base").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: shakkoumonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === shakkoumonId);
    await settle();

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
  });

  it.each([
    ["a level-3 [CS] source", CS_LV3],
    ["a level-4 source without the [CS] trait", YELLOW_LV4],
  ])("rejects the alternate cost from %s", (_label, base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-032", as: "shakkoumon" }] },
    });
    s.state.memory = 3;
    const baseId = s.inst("base").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: shakkoumonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([shakkoumonId]);
    expect(s.state.memory).toBe(3);
  });

  /**
   * No player intent declares a DNA digivolution, so the only public route into Shakkoumon's
   * DNA requirement is BT23-027 Angemon's [On Play], which DNA digivolves two of its
   * controller's Digimon into a Shakkoumon in hand. Angemon is the yellow level 4 material.
   */
  it.each([
    ["black", ANKYLOMON],
    ["blue", GARURUMON],
  ])("publicly DNA digivolves for 0 with a yellow level 4 plus a %s level 4", async (_label, partner) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: partner, as: "partner" }],
          hand: [
            { card: ANGEMON, as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-046", as: "playDraw" }, { card: "BT1-047", as: "dnaDraw" }, "BT1-049"],
        },
        1: { battleArea: [{ card: OPPONENT_LV3, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const angemonId = s.inst("angemon").instanceId;
    const partnerId = s.inst("partner").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId));
    await settle();

    const result = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shakkoumonId)!;
    expect(result.stack.map((card) => card.instanceId).sort()).toEqual([angemonId, partnerId].sort());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    // Angemon's play costs 5; the DNA digivolution itself costs 0.
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("playDraw").instanceId,
      s.inst("dnaDraw").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses DNA digivolution with a level-3 material and charges no ordinary fallback cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_LV3, as: "partner" }],
          hand: [
            { card: ANGEMON, as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-046", as: "playDraw" }, "BT1-047"],
        },
        1: { battleArea: [{ card: OPPONENT_LV3, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const angemonId = s.inst("angemon").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("playDraw").instanceId));
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      shakkoumonId,
      s.inst("playDraw").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual(
      [angemonId, s.inst("partner").instanceId].sort(),
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("De-Digivolves 1 opponent Digimon only when it DNA digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ANKYLOMON, as: "partner" }],
          hand: [
            { card: ANGEMON, as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-046", as: "playDraw" }, { card: "BT1-047", as: "dnaDraw" }, "BT1-049"],
        },
        1: {
          battleArea: [{ card: YELLOW_LV4, as: "victim", under: [{ card: "BT1-046", as: "victimBase" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const victimTopId = s.inst("victim").instanceId;
    const victimBaseId = s.inst("victimBase").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shakkoumon").instanceId),
    );
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === victimTopId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(victimBaseId);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([victimTopId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not De-Digivolve when it digivolves normally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV4, as: "base" }],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-046", as: "bonus" }, "BT1-047"],
        },
        1: { battleArea: [{ card: YELLOW_LV4, as: "victim", under: [{ card: "BT1-046", as: "victimBase" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shakkoumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("shakkoumon").instanceId);
    await settle();

    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("victim").instanceId);
    expect(s.state.players[1]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([
      s.inst("victimBase").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("makes the chosen opponent Digimon attack at the start of their main phase, and only that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV4, as: "base" }],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-046", as: "bonus" }, "BT1-047", "BT1-049", "BT1-050", "BT1-052"],
          security: ["BT1-046", "BT1-047", "BT1-049"],
        },
        1: {
          battleArea: [{ card: OPPONENT_LV3, as: "granted" }],
          deck: ["BT1-046", "BT1-047", "BT1-049", "BT1-050", "BT1-052"],
          security: ["BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shakkoumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("shakkoumon").instanceId);
    await settle();

    // The grant is delayed: nothing attacks on the digivolution itself.
    expect(s.perm("granted").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(observe(s.engine).customEffectGrants(s.perm("granted"))).toHaveLength(1);

    // Hand the turn over through the production loop. Seat 1's start-of-main forced attack
    // fires before its Main phase opens for input, and the memory it hands back ends that
    // turn, so settle on the turn boundary rather than on a Main-ready poll.
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"), 2000);
    await advance(s.engine)
      .waitForMainPhase(1)
      .catch(() => undefined);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.events.filter((event) => event.kind === "turnEnded").length >= 2, 2000);

    const forced = s.events.filter((event) => event.kind === "attackDeclared");
    expect(forced).toHaveLength(1);
    expect(forced[0]).toMatchObject({
      seat: 1,
      attackerPermanentId: s.perm("granted").permanentId,
      target: { kind: "player" },
    });
    expect(s.state.players[0]!.security).toHaveLength(2);

    // "Until your opponent's turn ends": the grant is gone once that turn has ended.
    expect(s.events.some((event) => event.kind === "turnEnded")).toBe(true);
    expect(observe(s.engine).customEffectGrants(s.perm("granted"))).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5277 gives the effect to a Digimon unaffected by effects, but it never triggers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV4, as: "base" }],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-046", as: "bonus" }, "BT1-047", "BT1-049", "BT1-050"],
          security: ["BT1-046", "BT1-047"],
        },
        1: {
          battleArea: [{ card: OPPONENT_LV3, as: "granted" }],
          deck: ["BT1-046", "BT1-047", "BT1-049", "BT1-050"],
          security: ["BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("granted").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { fromSourceKind: ["Digimon"] },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shakkoumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("shakkoumon").instanceId);
    await settle();

    // Q5277: the grant is still handed out; only its later activation is suppressed.
    expect(observe(s.engine).customEffectGrants(s.perm("granted"))).toHaveLength(1);

    // Hand the turn over through the production loop and let seat 1's whole turn run.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.events.filter((event) => event.kind === "turnEnded").length >= 2, 2000);

    expect(s.perm("granted").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["a yellow level-4 card", YELLOW_LV4],
    ["a non-yellow, non-black level-4 [CS] card", CS_ONLY_SOURCE],
  ])("plays %s from its own digivolution cards when an opponent effect deletes it", async (_label, source) => {
    // Public flow: the opponent plays BT15-089 Meteor Wing ("delete 1 of your opponent's
    // Digimon with 15000 DP or less", minus 2000 per security card the target's controller
    // holds — seat 0 keeps an empty security stack, so the 8000 DP host is in range).
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-032", as: "host", under: [{ card: source, as: "source" }] },
            { card: BLACK_LV4, as: "bystander", under: [{ card: YELLOW_LV4, as: "bystanderSource" }] },
          ],
          // One security card keeps the cap at 13000, still above every target here.
          security: ["BT1-047"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
        1: {
          battleArea: [{ card: OPPONENT_LV3, as: "redHost" }],
          hand: [{ card: OPPONENT_DELETE_OPTION, as: "meteorWing" }],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("meteorWing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId));
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual(
      [sourceId, s.inst("bystander").instanceId].sort(),
    );
    // Only the resolving permanent's own stack is a source pool.
    expect(s.perm("bystander").stack.map((card) => card.instanceId)).toEqual([s.inst("bystanderSource").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT23-032"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays a source when the opponent deletes it in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-032", as: "host", suspended: true, under: [{ card: YELLOW_LV4, as: "source" }] }],
          security: ["BT1-046"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
        1: {
          battleArea: [{ card: "BT23-025", as: "attacker" }],
          security: ["BT1-047", "BT1-049"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Shakkoumon attacks on its controller's turn, so it is suspended and legally
    // attackable when the opponent's turn arrives through the production loop.
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT23-032"]);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not play a source when its own controller's effect removes it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-032", as: "host", under: [{ card: YELLOW_LV4, as: "source" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT23-032", YELLOW_LV4].sort());
  });

  it("declines the optional source play and trashes the whole stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-032", as: "host", under: [{ card: YELLOW_LV4, as: "source" }] }],
          // One security card keeps the cap at 13000, still above every target here.
          security: ["BT1-047"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
        1: {
          battleArea: [{ card: OPPONENT_LV3, as: "redHost" }],
          hand: [{ card: OPPONENT_DELETE_OPTION, as: "meteorWing" }],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("meteorWing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle();

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual([YELLOW_LV4, "BT23-032"].sort());
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays nothing when no digivolution card is a level 4 or lower yellow, black or [CS] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT23-032",
              as: "host",
              under: [
                { card: OFF_POOL_LV4, as: "wrongColour" },
                { card: OFF_POOL_LV5, as: "wrongLevel" },
              ],
            },
          ],
          // One security card keeps the cap at 13000, still above every target here.
          security: ["BT1-047"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
        1: {
          battleArea: [{ card: OPPONENT_LV3, as: "redHost" }],
          hand: [{ card: OPPONENT_DELETE_OPTION, as: "meteorWing" }],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("meteorWing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongColour").instanceId, s.inst("wrongLevel").instanceId]),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5279 applies the same replacement from a stack where Shakkoumon is a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV4, as: "base" }],
          hand: [
            { card: "BT23-032", as: "shakkoumon" },
            { card: HOST_LV6, as: "host" },
          ],
          // One security card keeps the cap at 13000, still above every target here.
          security: ["BT1-047"],
          deck: [{ card: "BT1-046", as: "firstBonus" }, { card: "BT1-047", as: "secondBonus" }, "BT1-049"],
        },
        1: {
          // The forced-attack grant can trade the victim away, so a second red permanent
          // keeps the option's colour requirement satisfiable.
          battleArea: [
            { card: OPPONENT_LV3, as: "victim" },
            { card: "BT1-012", as: "redHost" },
          ],
          hand: [{ card: OPPONENT_DELETE_OPTION, as: "meteorWing" }],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shakkoumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("shakkoumon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("host").instanceId);
    await settle();

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId, s.inst("shakkoumon").instanceId]);
    expect(s.state.memory).toBe(0);

    // The opponent's own effect removes the whole stack, on their turn, publicly.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("meteorWing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === baseId));
    await settle();

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([baseId]);
    // The whole stack above the played source is trashed. "BT1-047" is this seat's security
    // card, checked and lost to the forced attack the [When Digivolving] grant produced.
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(
      [HOST_LV6, "BT23-032", "BT1-047"].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * Q6250: with BT23-027 Angemon in its digivolution cards, the controller may accept
   * ＜Barrier＞ first and still use this [All Turns] effect to play a source card afterwards.
   * Accepting Barrier trashes the top security card and keeps Shakkoumon on the battle area;
   * the leave replacement still offers its source play, and Angemon leaves the stack for the
   * battle area.
   */
  it("Q6250 plays a source card after ＜Barrier＞ prevents the battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-032", as: "host", suspended: true, under: [{ card: ANGEMON, as: "angemon" }] }],
          security: ["BT1-046"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
        1: {
          battleArea: [{ card: "BT23-025", as: "attacker" }],
          security: ["BT1-047", "BT1-049"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const angemonId = s.inst("angemon").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Shakkoumon attacks on its own turn, so the opponent can legally attack it next turn.
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
