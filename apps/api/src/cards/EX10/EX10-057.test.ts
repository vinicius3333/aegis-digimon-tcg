import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-057.js";
import "../index.js"; // register compiled cards so the real play / attack / turn-loop paths run

/**
 * EX10-057 Piedmon (Purple, Lv.6 Mega, [Wizard]/[Dark Masters], play cost 11, 11000 DP, no
 * digivolution requirements).
 *
 *   [Hand] [Main] If you don't have any Digimon other than Digimon with [Dark Masters] in
 *                 their texts, you may play this card with the play cost reduced by 5. At turn
 *                 end, delete the Digimon this effect played.
 *   [On Play] [When Attacking] Delete 1 of your opponent's unsuspended Digimon.
 *   [All Turns] This Digimon can only digivolve into [Apocalymon].
 *   [On Deletion] If you have no purple face-up security cards, place this Digimon face up as
 *                 the bottom security card.
 *   [Security] If this card was face-up, you may play 1 level 5 or lower card with
 *              [Dark Masters] in its text from your hand or trash without paying the cost.
 *
 * Every behavioural case below is driven from a public intent (playCard, attack, digivolve,
 * activateEffect) or the real turn loop. No `advance.fire*` injection and no ledger reach.
 *
 * KB coverage: Q5149 (what "[X] in its text" means), Q5150/Q5151/Q5152 (cards placed face up
 * in security), Q5153 (a shuffle re-hides them), Q5154 (activatable with no Digimon at all),
 * Q5155/Q5740 (the turn player orders the delayed delete against another turn-end effect),
 * Q5156 (what "if this card was face-up" means), Q5739 (the played Digimon is deleted at turn
 * end), Q6513 (the [Security] effect resolves and the card then battles).
 *
 * Fixture vocabulary
 * - BT15-072 Vilemon: Purple, level 4, trait [Evil] — carries "[Dark Masters]" ONLY in its
 *   effect text. The Q5149 lever for "Digimon with [Dark Masters] in their texts".
 * - BT1-009 / BT1-013 (Lv.3), BT1-014 (Lv.4): inert main-deck Digimon, no effect, inherited or
 *   security text, so they can neither open a decision nor change a result.
 * - BT15-102 Apocalymon (Lv.7, Purple Lv.6 evolution cost 6) — the one allowed digivolve
 *   target — and BT2-083 Millenniummon (Lv.7, Purple Lv.6 evolution cost 6) — an otherwise
 *   legal route the printed constraint must refuse.
 * - BT10-071 Gazimon: a plain Purple Lv.3, used as the pre-existing purple face-up security
 *   card that switches the [On Deletion] condition off.
 * - EX3-029 Airdramon: an unrelated peer whose [On Play] shuffles the security stack (Q5153).
 */

const CARD_ID = "EX10-057";

/** The OnDeclaration effectKey for the card's [Hand] [Main] reduced-cost play. */
function reducedCostPlayEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = observe(s.engine).cardSource(instance);
  const found = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith(`${CARD_ID}/`),
  );
  if (found === undefined) throw new Error(`${CARD_ID} surfaces no [Hand] [Main] activated effect`);
  return found.effectKey;
}

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId);
}

function topsOf(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map(({ topCard }) => topCard?.cardId ?? "");
}

describe("EX10-057 Piedmon — catalog and compiled clauses", () => {
  it("records the exact catalog facts and every printed executable clause", () => {
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Piedmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Wizard", "Dark Masters"],
      maxCountInDeck: 4,
    });
    // No inherited effect; the Security text is the free-play clause.
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText).toContain("If this card was face-up");
    expect(definition.effectText).toContain("Delete 1 of your opponent's unsuspended Digimon");

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual([
      "Main",
      "OnPlay",
      "WhenAttacking",
      "AllTurns",
      "OnDeletion",
      "Security",
    ]);
    // The turn-end self-delete belongs to the reduced-cost play, not to [On Play] (Q5739).
    expect(compiled.effects[0]!.isFromHand).toBe(true);
    expect(compiled.effects[0]!.actions.map(({ kind }) => kind)).toEqual(["PlayWithoutCost", "DelayedDeletePlayed"]);
    expect(compiled.effects[1]!.actions.map(({ kind }) => kind)).toEqual(["Delete"]);
    expect(compiled.effects[2]!.actions.map(({ kind }) => kind)).toEqual(["Delete"]);
    expect(compiled.effects[3]!.actions.map(({ kind }) => kind)).toEqual(["RestrictDigivolveInto"]);
  });
});

describe("EX10-057 — [Hand] [Main] reduced-cost play", () => {
  it("plays this card from hand for 11 − 5 with only a [Dark Masters]-text Digimon out (Q5149)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "piedmon" }],
          // Q5149: Vilemon carries "[Dark Masters]" only in its EFFECT TEXT — no name, no trait —
          // and still counts as a "Digimon with [Dark Masters] in their texts", so the gate holds.
          battleArea: [{ card: "BT15-072", as: "textOnly" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const piedmonId = s.inst("piedmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: piedmonId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("piedmon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId) && s.state.pendingDecision === undefined);

    expect(onField(s, piedmonId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0); // 6 − (11 − 5)
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some(({ kind }) => kind === "actionRejected")).toBe(false);
    // REVERT-CONFIRM-RED: drop `reduceCostBy: 5` => the play costs 11 => memory ends at −5.
  });

  it("activates with no Digimon at all (Q5154)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "piedmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const piedmonId = s.inst("piedmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: piedmonId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("piedmon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId));

    expect(onField(s, piedmonId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not play for the reduced cost while a non-[Dark Masters] Digimon is out", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "piedmon" }],
          battleArea: [{ card: "BT1-009", as: "plain" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const piedmonId = s.inst("piedmon").instanceId;

    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: piedmonId,
      effectKey: reducedCostPlayEffectKey(s, s.inst("piedmon")),
    });
    await settle();

    expect(onField(s, piedmonId)).toBe(false);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([piedmonId]);
    expect(s.state.memory).toBe(6);
    // REVERT-CONFIRM-RED: drop the `excludeNameOrTrait` rejection => `youHaveNone` holds =>
    // EX10-057 is played.
  });

  it("deletes the Digimon this effect played at its own turn end through the real turn loop (Q5739)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "piedmon" }, "BT1-014"],
          // A second copy on the board: it carries the [Dark Masters] trait, so the gate holds,
          // and it is the control that proves only the PLAYED Digimon is deleted.
          battleArea: [{ card: CARD_ID, as: "bystander" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"], security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const piedmonId = s.inst("piedmon").instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: piedmonId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("piedmon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId));
    expect(onField(s, piedmonId)).toBe(true);

    // The production turn loop closes the turn — no injected OnEndTurn.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(onField(s, piedmonId)).toBe(false);
    // It left the battle area, so its own [On Deletion] clause ran: with no purple face-up
    // security card it is placed face up at the bottom of security (Q5150).
    const security = s.state.players[0]!.security;
    expect(security.map(({ instanceId }) => instanceId).at(-1)).toBe(piedmonId);
    expect(security.at(-1)!.faceUp).toBe(true);
    // Only the Digimon THIS effect played is deleted; the bystander survives.
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: drop the `DelayedDeletePlayed` action => EX10-057 survives turn end.

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves a normally played copy alive through its own turn end (the gate on Q5739)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "piedmon" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "victim" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const piedmonId = s.inst("piedmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: piedmonId })).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId) && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0); // full printed cost, no reduction on a normal play

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(onField(s, piedmonId)).toBe(true);
    // REVERT-CONFIRM-RED: move `DelayedDeletePlayed` back under OnPlay => the normal play arms
    // the delete => EX10-057 is deleted here. This is the lever binding the delete to the
    // reduced-cost [Hand] [Main] play alone (Q5739).

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-057 — [On Play] / [When Attacking] delete 1 unsuspended opposing Digimon", () => {
  it("deletes exactly the unsuspended opposing Digimon when played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "piedmon" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "unsuspended" },
            { card: "BT1-013", as: "suspended", suspended: true },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const unsuspendedId = s.perm("unsuspended").topCard!.instanceId;
    const suspendedPermanentId = s.perm("suspended").permanentId;
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    // The suspended Digimon is not a legal target, so it is the only survivor.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([suspendedPermanentId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(unsuspendedId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some(({ kind }) => kind === "actionRejected")).toBe(false);
    // REVERT-CONFIRM-RED: drop the OnPlay `Delete` action => both opposing Digimon survive;
    // drop `unsuspended: true` => the suspended Digimon becomes a candidate too.
  });

  it("deletes again on a real attack declaration ([When Attacking])", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "piedmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "unsuspended" },
            { card: "BT1-013", as: "suspended", suspended: true },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const unsuspendedId = s.perm("unsuspended").topCard!.instanceId;
    const suspendedPermanentId = s.perm("suspended").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("piedmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([suspendedPermanentId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(unsuspendedId);
    // One security card was checked by the attack; the attacker survives.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(topsOf(s, 0)).toEqual([CARD_ID]);
    // REVERT-CONFIRM-RED: drop the WhenAttacking `Delete` action => the unsuspended Digimon
    // survives the attack declaration.
  });

  it("deletes nothing when every opposing Digimon is suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "piedmon" }] },
        1: {
          battleArea: [{ card: "BT1-013", as: "suspended", suspended: true }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const suspendedPermanentId = s.perm("suspended").permanentId;
    const suspendedInstanceId = s.perm("suspended").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("piedmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([suspendedPermanentId]);
    // The only card in the trash is the security card the attack checked.
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(suspendedInstanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("EX10-057 — [All Turns] this Digimon can only digivolve into [Apocalymon]", () => {
  it("allows [Apocalymon] and refuses another otherwise legal level 7 through the digivolve intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "piedmon" }],
          hand: [
            { card: "BT15-102", as: "apocalymon" },
            { card: "BT2-083", as: "millenniummon" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 8;
    const host = s.perm("piedmon");

    // BT2-083 Millenniummon prints a Purple Lv.6 evolution cost, so only the [All Turns]
    // clause stands between it and a legal digivolve.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("millenniummon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("piedmon").topCard!.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(8);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("piedmon").topCard!.cardId === "BT15-102");
    expect(s.perm("piedmon").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    // REVERT-CONFIRM-RED: drop the AllTurns `RestrictDigivolveInto` action => Millenniummon is
    // accepted.
  });

  it("still deletes the played host at turn end after it digivolved, the turn player choosing the order (Q5155/Q5740)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "piedmon" }, { card: "BT15-102", as: "apocalymon" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          trash: ["BT1-013"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"], security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const piedmonId = s.inst("piedmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: piedmonId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("piedmon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId));
    const host = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === piedmonId)!;

    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("piedmon").topCard!.cardId === "BT15-102");

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // The whole stack left the battle area: "the Digimon this effect played" is the permanent,
    // which the digivolve did not replace (Q5155).
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT15-102"]));
    // Q5155/Q5740: the delayed delete and Apocalymon's [End of Your Turn] are simultaneous
    // pending processing, so the TURN PLAYER is asked for the order rather than the engine
    // fixing one.
    const orderPrompts = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
    expect(orderPrompts.length).toBeGreaterThan(0);
    expect(orderPrompts.every(({ seat }) => seat === 0)).toBe(true);
    expect(orderPrompts.some(({ req }) => (req.options?.triggerKeys ?? []).length > 1)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-057 — [On Deletion] face-up security placement", () => {
  it("places itself face up as the BOTTOM security card after losing a real battle (Q5150)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "piedmon" }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-014", as: "secSecond" },
          ],
        },
        // The wall is SUSPENDED, so the attacker's [When Attacking] delete has no legal target
        // and the battle itself decides the outcome.
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const piedmonId = s.perm("piedmon").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("piedmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === piedmonId));

    const security = s.state.players[0]!.security;
    expect(security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secSecond").instanceId,
      piedmonId,
    ]);
    // Q5150: the placed card stays revealed; the pre-existing cards stay face down.
    expect(security[2]!.faceUp).toBe(true);
    expect(security.slice(0, 2).every(({ faceUp }) => faceUp !== true)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(piedmonId);
    // REVERT-CONFIRM-RED: drop `toTop: false` => the card lands on TOP of security and the
    // exact-order assertion fails; drop `faceUp: true` => the faceUp assertion fails.
  });

  it("goes to the trash instead when a purple face-up security card already exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "piedmon" }],
          // BT10-071 Gazimon is a plain Purple Lv.3 with no effect text of any kind.
          security: [{ card: "BT10-071", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const piedmonId = s.perm("piedmon").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("piedmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === piedmonId));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(piedmonId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    // REVERT-CONFIRM-RED: drop the `youHaveNone` purple-face-up-security condition => the card
    // is placed into security and this assertion fails.
  });

  it("still places itself when the only face-up security card is another colour", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "piedmon" }],
          // BT1-009 Monodramon is Red: the condition counts PURPLE face-up security only.
          security: [{ card: "BT1-009", as: "redFaceUp", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const piedmonId = s.perm("piedmon").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("piedmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === piedmonId));

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("redFaceUp").instanceId,
      piedmonId,
    ]);
    // REVERT-CONFIRM-RED: drop `colors: ["Purple"]` from the condition filter => any face-up
    // security card blocks the placement and Piedmon goes to the trash.
  });
});

describe("EX10-057 — [Security] free play", () => {
  it("plays a level 5 or lower [Dark Masters]-text card from hand and then battles (Q5151/Q5152/Q6513)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          // Q5149: BT15-072 Vilemon has [Dark Masters] only in its effect text.
          hand: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: CARD_ID, as: "guard", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const guardId = s.inst("guard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // Q5151/Q5152: the check ran normally with the card left revealed, and its [Security]
    // effect triggered and resolved for free (no memory moved for the defender's play).
    expect(topsOf(s, 1)).toContain("BT15-072");
    expect(s.state.players[1]!.hand).toHaveLength(0);
    // Q6513: the [Security] effect activates and the card THEN battles — 11000 DP deletes the
    // 3000 DP attacker, and the security Digimon goes to the trash.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(guardId);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("plays the same card from the trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          trash: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: CARD_ID, faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-072"));

    expect(topsOf(s, 1)).toContain("BT15-072");
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("freePlay").instanceId);
  });

  it("does nothing when the card was checked face down (Q5156)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: CARD_ID, faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // Q5156: "if this card was face-up" is met only when the card is face-up in security AS IT
    // IS CHECKED. A face-down check leaves the hand card alone.
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("freePlay").instanceId]);
    expect(topsOf(s, 1)).not.toContain("BT15-072");
    // REVERT-CONFIRM-RED: drop the `sourceWasFaceUpSecurity` condition => Vilemon is played here.
  });

  it("refuses a level 6 [Dark Masters] card and a low-level card with no [Dark Masters] text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          // EX10-058 Lilithmon is level 6 (over the bound); BT10-071 Gazimon carries no
          // [Dark Masters] text at all.
          hand: [
            { card: "EX10-058", as: "tooHigh" },
            { card: "BT10-071", as: "noText" },
          ],
          security: [{ card: CARD_ID, faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT10-071", "EX10-058"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("EX10-057 — face-up security cards under a shuffle (Q5153)", () => {
  it("is turned face down again when a peer effect shuffles the security stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          // EX3-029 Airdramon's [On Play] reveals 1 security card to hand and THEN shuffles the
          // stack — the only public route to a security shuffle in this fixture.
          hand: [{ card: "EX3-029", as: "shuffler" }, "BT1-014"],
          security: [
            { card: "BT1-009", as: "decoy" },
            { card: CARD_ID, as: "faceUpGuard", faceUp: true },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("decoy").instanceId);
    const guardId = s.inst("faceUpGuard").instanceId;
    expect(s.state.players[0]!.security.find(({ instanceId }) => instanceId === guardId)!.faceUp).toBe(true);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1 && s.state.pendingDecision === undefined);

    // Q5153: the shuffle puts every face-up security card back face down.
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([guardId]);
    expect(s.state.players[0]!.security.every(({ faceUp }) => faceUp !== true)).toBe(true);
  });
});
