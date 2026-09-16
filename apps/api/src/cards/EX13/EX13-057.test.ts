import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-057.js";

const CARD_ID = "EX13-057";

// Fixtures, and why each one is here:
//   BT9-062  Raptordramon Black Lv.4 [Cyborg]/[X Antibody], NO [Chronicle], no printed text: the
//                         header's NAME half only.
//   BT20-012 Ginryumon    RED/Black Lv.4 [Chronicle]: the colourless trait half only, on a colour
//                         no printed EvoCost on this card admits.
//   BT2-056  Numemon      a plain Black Lv.4 that is neither — the illegal-source negative.
//   BT20-048 Dorumon      Black/Yellow Lv.3 [Beast]/[X Antibody]/[Chronicle] — a legal grant
//                         recipient AND the [Chronicle] subject of the inherited replacement.
//   BT13-063 Dorumon      Black Lv.3 [Beast]/[X Antibody] with NO [Chronicle] — proves the grant
//                         union reaches [X Antibody] alone, and that the inherited replacement
//                         does NOT (it is [Chronicle]-only).
//   BT1-009..BT1-014      inert main-deck Digimon — the plain non-matches and deck filler.
//   EX13-055 Raptordramon this set's Lv.4, whose [When Attacking] digivolve is the PUBLIC route
//                         that resolves this card's [When Digivolving] window inside an open
//                         attack — the only way the printed "If during an attack" rider is
//                         reachable through real play.
//   BT20-056 Alphamon     Black/Yellow Lv.6 [Chronicle]: the [End of Attack] destination.
//   BT20-018 Ouryumon     Red/Black Lv.6 [Chronicle]: a second legal destination.
//   BT13-075 Alphamon     Black Lv.6 [X Antibody] with NO [Chronicle] — the near miss.
const NAME_ONLY_SOURCE = "BT9-062";
const TRAIT_ONLY_SOURCE = "BT20-012";
const NEITHER_SOURCE = "BT2-056";
const CHRONICLE_LV3 = "BT20-048";
const X_ANTIBODY_LV3 = "BT13-063";
const NON_MATCH = "BT1-009";
const LV4_FEEDER = "EX13-055";
const CHRONICLE_LV6 = "BT20-056";

describe("EX13-057 Grademon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Grademon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Warrior", "X Antibody", "Chronicle"],
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      effectText:
        "[Digivolve] [Raptordramon]/Lv.4 w/[Chronicle] trait: Cost 3 \n\n[On Play] [When Digivolving] Until your opponent's turn ends, 1 of your [X Antibody] or [Chronicle] trait Digimon gains ＜Reboot＞ and ＜Blocker＞. If during an attack, it also isn't affected by their Digimon effects and gets +5000 DP.\n[End of Attack] [Once Per Turn] This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or trash.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When any of your [Chronicle] trait Digimon would leave the battle area, by trashing your top security card, they don't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });

    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { namesExact: ["Raptordramon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["Chronicle"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toBeUndefined();

    const recipient = {
      controller: "mine",
      kind: ["Digimon"],
      zone: "battleArea",
      nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
    };
    const duringAttack = { kind: "duringAttack" };

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.frequency).toBeUndefined();
      expect(effect.actions).toMatchObject([
        // One prompt picks the recipient; every later action reuses it with `sameTarget`.
        {
          kind: "GainKeyword",
          target: { filter: recipient, count: 1 },
          keyword: { keyword: "Reboot" },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: { filter: recipient, count: 1, sameTarget: true },
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GrantImmunity",
          target: { filter: recipient, count: 1, sameTarget: true },
          immuneFrom: "opponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          condition: duringAttack,
        },
        {
          kind: "ModifyDP",
          target: { filter: recipient, count: 1, sameTarget: true },
          amount: 5000,
          duration: "untilOpponentTurnEnd",
          condition: duringAttack,
        },
      ]);
      expect(effect.actions).toHaveLength(4);
    }

    const endOfAttack = compiled.effects.find((effect) => effect.trigger === "EndOfAttack")!;
    expect(endOfAttack.frequency).toBe("OncePerTurn");
    expect(endOfAttack.actions).toMatchObject([
      {
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
        },
        from: ["hand", "trash"],
        payCost: true,
        optional: true,
      },
    ]);

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          optional: true,
          affectsAll: true,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
          target: { count: "all" },
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
    // No cause qualifier is printed, so the watcher must NOT narrow by cause.
    expect((inherited.actions[0] as { leaveCause?: string }).leaveCause).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] [Raptordramon]/Lv.4 w/[Chronicle] trait: Cost 3
  // ---------------------------------------------------------------------------

  it("takes the [Raptordramon] half for 3 and refuses the [Chronicle] half on the same source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NAME_ONLY_SOURCE, as: "base" },
            { card: CHRONICLE_LV3, as: "ally" },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);

    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: NAME_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "grademon" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 6;
    await wrongHalf.ready();

    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(NAME_ONLY_SOURCE);
    expect(wrongHalf.state.memory).toBe(6);
  });

  it("takes the colourless Lv.4 [Chronicle] half for 3 from a RED source no EvoCost admits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);

    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "grademon" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 6;
    await wrongHalf.ready();
    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(TRAIT_ONLY_SOURCE);
    expect(wrongHalf.state.memory).toBe(6);
  });

  it("refuses both header halves for a plain Black Lv.4 and charges the printed 4 instead", async () => {
    for (const alternateRequirementIndex of [0, 1]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: NEITHER_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [NON_MATCH, "BT1-010"],
        },
      });
      s.state.memory = 6;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("grademon").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("base").topCard.cardId).toBe(NEITHER_SOURCE);
      expect(s.state.memory).toBe(6);
    }

    const printedRoute = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEITHER_SOURCE, as: "base" },
            { card: CHRONICLE_LV3, as: "ally" },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    printedRoute.state.memory = 6;
    await printedRoute.ready();

    expect(
      printedRoute.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printedRoute.perm("base").permanentId,
        instanceId: printedRoute.inst("grademon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => printedRoute.perm("base").topCard.cardId === CARD_ID);
    await settle(() => printedRoute.state.pendingDecision === undefined);
    expect(printedRoute.state.memory).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] the ＜Reboot＞ + ＜Blocker＞ grant.
  // ---------------------------------------------------------------------------

  it("gives ＜Reboot＞ and ＜Blocker＞ to ONE chosen [Chronicle] Digimon on play, and nothing else", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
            { card: NON_MATCH, as: "plain", dp: 9000 },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, autoChooseOption: true },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot"));

    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(true);
    // A single recipient: the non-[Chronicle]/[X Antibody] ally and the opponent get nothing.
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("theirs"), "Reboot")).toBe(false);
    // Outside an attack the printed rider does NOT apply: base DP and no immunity.
    expect(s.perm("chronicle").currentDP).toBe(9000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(false);
    assertNoLoudGap(s);
  });

  it("reaches an [X Antibody] Digimon without [Chronicle] and never a plain one", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: X_ANTIBODY_LV3, as: "xOnly", dp: 9000 }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("xOnly"), "Reboot"));
    expect(observe(s.engine).hasKeyword(s.perm("xOnly"), "Blocker")).toBe(true);

    // The same clause with only a plain Digimon on board: nobody is eligible.
    const noCandidate = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: NON_MATCH, as: "plain", dp: 9000 }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    noCandidate.state.memory = 8;
    await noCandidate.ready();
    expect(
      noCandidate.engine.applyIntent(0, { type: "playCard", instanceId: noCandidate.inst("grademon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => noCandidate.state.pendingDecision === undefined);
    expect(observe(noCandidate.engine).hasKeyword(noCandidate.perm("plain"), "Reboot")).toBe(false);
    // The Grademon itself carries [X Antibody] and [Chronicle], so it is its own legal target.
    const self = noCandidate.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(observe(noCandidate.engine).hasKeyword(self, "Reboot")).toBe(true);
  });

  // The printed "If during an attack" rider. STRUCTURAL: the [When Digivolving] window is fired
  // with an attacker on the payload, which is exactly what `duringAttack` reads
  // (`interpreter/conditions.ts:650` — `ctx.trigger.attackerPermanentId !== undefined`). It proves
  // the four halves land on ONE recipient and that the rider is gated, not that public play can
  // reach the gate; the next test carries that claim.
  it("adds the immunity and +5000 DP to the same recipient when the trigger carries an attacker", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          deck: [NON_MATCH, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("grademon"), {
      attackerPermanentId: s.perm("grademon").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);

    // All four halves of the one printed sentence landed on the SAME chosen Digimon.
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(true);
    expect(s.perm("chronicle").currentDP).toBe(14_000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);
    // Scope: the opponent's board never receives any of it.
    expect(s.perm("theirs").currentDP).toBe(9000);
    expect(observe(s.engine).hasKeyword(s.perm("theirs"), "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });

  // Public route to the printed "If during an attack": a real declared attack by EX13-055,
  // whose [When Attacking] clause digivolves the attacker into this card while its own attack
  // is still open, so this card's [When Digivolving] window resolves DURING an attack.
  //
  // The attack must be declared through the public `attack` intent: the open attack lives in
  // the combat controller, and `GameEngine.fireEnteredByEffect` copies
  // `combat.currentAttackerId` onto the [When Digivolving] trigger it raises. An injected
  // `advance().fireForPermanent(OnUseAttack, ...)` opens no attack, so the rider correctly
  // does not apply there.
  it("applies the rider when EX13-055 digivolves into it mid-attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV4_FEEDER, as: "raptor", under: ["BT1-010"], dp: 5000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(true);
    expect(s.perm("chronicle").currentDP).toBe(14_000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // [End of Attack] [Once Per Turn] digivolve into a [Chronicle] card in hand or trash.
  // ---------------------------------------------------------------------------

  it("digivolves at end of attack into a [Chronicle] card in hand, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          hand: [
            { card: CHRONICLE_LV6, as: "firstTarget" },
            { card: "BT20-018", as: "secondTarget" },
          ],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();
    const grademonId = s.perm("grademon").permanentId;

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("grademon"));
    await settle(() => s.perm("grademon").stack.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("grademon").permanentId).toBe(grademonId);
    expect(s.perm("grademon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);
    const afterFirst = s.perm("grademon").topCard.cardId;
    expect([CHRONICLE_LV6, "BT20-018"]).toContain(afterFirst);

    // Same turn, second [End of Attack] window: the once-per-turn gate refuses it.
    const memoryAfterFirst = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("grademon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("grademon").topCard.cardId).toBe(afterFirst);
    expect(s.perm("grademon").stack).toHaveLength(2);
    expect(s.state.memory).toBe(memoryAfterFirst);
  });

  it("digivolves at end of attack into a [Chronicle] card in the TRASH", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          trash: [{ card: CHRONICLE_LV6, as: "target" }],
          hand: [{ card: "BT1-014", as: "spare" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("grademon"));
    await settle(() => s.perm("grademon").topCard.cardId === CHRONICLE_LV6);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("grademon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("target").instanceId);
  });

  it("refuses a non-[Chronicle] destination and leaves the quota untouched when declined", async () => {
    const noCandidate = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          // BT13-075 Alphamon: a Lv.6 [X Antibody] Digimon card with NO [Chronicle] trait.
          hand: [{ card: "BT13-075", as: "nearMiss" }],
          deck: [NON_MATCH, "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    noCandidate.state.memory = 9;
    await noCandidate.ready();

    await advance(noCandidate.engine).fire(EffectTiming.OnEndAttack, noCandidate.perm("grademon"));
    await settle(() => noCandidate.state.pendingDecision === undefined);
    expect(noCandidate.perm("grademon").topCard.cardId).toBe(CARD_ID);
    expect(noCandidate.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      noCandidate.inst("nearMiss").instanceId,
    ]);
    expect(noCandidate.state.memory).toBe(9);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          hand: [{ card: CHRONICLE_LV6, as: "target" }],
          deck: [NON_MATCH, "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    declined.state.memory = 9;
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.OnEndAttack, declined.perm("grademon"));
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.perm("grademon").topCard.cardId).toBe(CARD_ID);
    expect(declined.state.memory).toBe(9);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] [Once Per Turn] "by trashing your top security card, they don't leave".
  // ---------------------------------------------------------------------------

  it("saves a [Chronicle] ally from an effect deletion by trashing the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          security: [
            { card: "BT1-011", as: "cost" },
            { card: "BT1-012", as: "kept" },
          ],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === allyId)).toBe(true);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
  });

  // No cause qualifier is printed, so BATTLE reaches the watcher too. Driven by a real declared
  // attack that the [Chronicle] Digimon loses.
  it("saves a [Chronicle] ally that loses a real battle, not only effect deletions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 3000 },
          ],
          security: [
            { card: "BT1-011", as: "cost" },
            { card: "BT1-012", as: "kept" },
          ],
          deck: ["BT1-013", "BT1-010"],
        },
        1: {
          battleArea: [{ card: NON_MATCH, as: "wall", dp: 9000, suspended: true }],
          deck: ["BT1-013", "BT1-011"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: allyId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // 3000 lost to 9000, but the replacement paid a security card and the attacker stayed.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === allyId)).toBe(true);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("does not protect an [X Antibody] Digimon without the [Chronicle] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: X_ANTIBODY_LV3, as: "xOnly", dp: 9000 },
          ],
          security: [{ card: "BT1-011", as: "untouched" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("xOnly").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  it("lets the deletion resolve when declined, when security is empty, and after the per-turn use", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          security: [{ card: "BT1-011", as: "untouched" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await declined.ready();
    expect(await advance(declined.engine).verb.deletePermanent([declined.perm("ally").permanentId], "byEffect")).toBe(
      1,
    );
    expect(declined.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      declined.inst("untouched").instanceId,
    ]);

    const noSecurity = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await noSecurity.ready();
    expect(
      await advance(noSecurity.engine).verb.deletePermanent([noSecurity.perm("ally").permanentId], "byEffect"),
    ).toBe(1);

    // [Once Per Turn]: the second deletion in the same turn goes through even with security left.
    const twice = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "first", dp: 9000 },
            { card: CHRONICLE_LV3, as: "second", dp: 9000 },
          ],
          security: [
            { card: "BT1-011", as: "cost" },
            { card: "BT1-012", as: "kept" },
          ],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await twice.ready();
    expect(await advance(twice.engine).verb.deletePermanent([twice.perm("first").permanentId], "byEffect")).toBe(0);
    await settle(() => twice.state.pendingDecision === undefined);
    expect(await advance(twice.engine).verb.deletePermanent([twice.perm("second").permanentId], "byEffect")).toBe(1);
    expect(twice.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      twice.inst("kept").instanceId,
    ]);
  });

  it("grants the inherited clause only from inside a stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: ["BT1-012"] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          security: [{ card: "BT1-011", as: "untouched" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  // The printed duration "Until your opponent's turn ends" plus both granted keywords, proven
  // through the real turn loop: the grant survives into the opponent's turn, ＜Reboot＞ unsuspends
  // the recipient at THEIR unsuspend phase, ＜Blocker＞ intercepts a real declared attack, and both
  // keywords are gone once that turn ends.
  it("carries both keywords into the opponent's turn, reboots, blocks, and expires at that turn's end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: CHRONICLE_LV3, as: "chronicle", dp: 12_000 }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker", dp: 6000 }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();

    // The grant is made inside a REAL own turn that is then played out to its end, so the
    // end-of-turn duration sweep runs before the opponent's turn begins. A shorter duration
    // (the engine's `UntilEachTurnEnd`) would be swept right here.
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot"));

    // Suspend the recipient by hand, as an attack of its own would have.
    s.perm("chronicle").isSuspended = true;
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    // ＜Reboot＞: it unsuspended during the OPPONENT's unsuspend phase, and the grant is still on.
    expect(s.perm("chronicle").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(true);

    // ＜Blocker＞: a real declared attack at the player is intercepted instead of hitting security.
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("chronicle").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    // 12000 blocker beat the 6000 attacker, so the battle happened rather than the security check.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    // "Until your opponent's turn ends": both keywords are gone the moment that turn ended.
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(false);
  });

  // "isn't affected by THEIR DIGIMON effects": the printed scope is Digimon-sourced effects only.
  // Driven with real opponent cards on the opponent's own turn while the rider is live.
  it("blanks an opponent Digimon's effect during the attack rider while an opponent Option still lands", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV4_FEEDER, as: "raptor", under: ["BT1-010"], dp: 5000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          hand: [
            { card: "BT20-033", as: "digimonEffect" },
            { card: "BT1-106", as: "optionEffect" },
          ],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(14_000);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    // BT20-033 LoaderLeomon's [On Play] would give 1 of THEIR Digimon -3000 DP. It is a Digimon
    // effect, so the printed immunity refuses it outright.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("digimonEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(14_000);

    // BT1-106 is an OPTION with the same shape of effect. The printed scope does not cover it.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("optionEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(7000);
  });

  it("leaves the recipient exposed to an opponent Digimon effect when the grant happened OUTSIDE an attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: CHRONICLE_LV3, as: "chronicle", dp: 9000 }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          hand: [{ card: "BT20-033", as: "digimonEffect" }],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot"));
    // No attack was open, so neither half of the rider applied.
    expect(s.perm("chronicle").currentDP).toBe(9000);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("digimonEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    // Without the rider the opponent's Digimon effect reaches it normally.
    expect(s.perm("chronicle").currentDP).toBe(6000);
  });

  // The [End of Attack] window opened by a REAL declared attack, and its same-turn refusal against
  // a second real attack by a DIFFERENT Digimon.
  it("fires [End of Attack] off a real attack and refuses a second attack the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 },
            { card: CHRONICLE_LV3, as: "other", dp: 9000 },
          ],
          hand: [
            { card: CHRONICLE_LV6, as: "firstTarget" },
            { card: "BT20-018", as: "secondTarget" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013", "BT1-011"], security: ["BT1-014", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 12;
    await s.ready();
    const grademonId = s.perm("grademon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: grademonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => !observe(s.engine).isAttacking());

    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === grademonId)!;
    const afterFirst = host.topCard.cardId;
    expect([CHRONICLE_LV6, "BT20-018"]).toContain(afterFirst);
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);

    // [Once Per Turn]: the SECOND attack this turn, by a different Digimon, opens no usable window.
    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    const reread = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === grademonId)!;
    expect(reread.topCard.cardId).toBe(afterFirst);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
  });
});
