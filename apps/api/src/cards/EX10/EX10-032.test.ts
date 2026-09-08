import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-032.js";
import "../index.js";

const CARD_ID = "EX10-032";

/**
 * EX10-032 Proganomon (Black, Lv.5 Ultimate, [Mineral]/[LIBERATOR]).
 *
 * [Hand] [Main] If you have [Close], by placing 1 [Landramon] from your trash as any of your
 *   [Sunarizamon]'s bottom digivolution card, it digivolves into this card for a digivolution
 *   cost of 3, ignoring digivolution requirements.
 * [On Play] [When Digivolving] [When Attacking] By trashing any 1 [Mineral] or [Rock] trait
 *   card from your Digimon's digivolution cards, 1 of your such Digimon gains ＜Collision＞,
 *   ＜Piercing＞ and +3000 DP until your opponent's turn ends.
 * Inherited: when effects trash this card from a [Mineral] or [Rock] trait Digimon's
 *   digivolution cards, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
 *
 * Every timing below is reached through a public intent (playCard, digivolve, attack,
 * activateEffect), never through injected timing.
 */
const INERT_DECK = ["BT1-013", "BT1-014", "BT1-009"];

describe("EX10-032 Proganomon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Proganomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
      maxCountInDeck: 4,
    });
  });

  it("maps every printed clause onto compiled IR", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromHand: true,
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Close"], match: "name" }] } },
      actions: [
        {
          kind: "DigivolveViaPlacement",
          cost: 3,
          ignoreDigivolutionRequirements: true,
          placeCost: {
            kind: "placeFromTrash",
            destination: "digivolutionStack",
            position: "bottom",
            target: { filter: { nameOrTrait: [{ tokens: ["Landramon"], match: "name" }] }, count: 1 },
            hostFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Sunarizamon"], match: "name" }],
            },
          },
          into: { isSelfRef: true },
        },
      ],
    });

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Collision" },
            duration: "untilOpponentTurnEnd",
            target: {
              bindAs: "chosen",
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
            },
            cost: { kind: "trash", target: { from: ["digivolutionCards"], count: 1 } },
            optional: true,
            abortOnDecline: true,
          },
          { kind: "GainKeyword", keyword: { keyword: "Piercing" }, target: { fromSelectionRef: "chosen" } },
          { kind: "ModifyDP", amount: 3000, target: { fromSelectionRef: "chosen" } },
        ],
      });
    }

    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
          actions: [{ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent" } } }],
        },
      ],
    });
  });

  it("Q5091 places Landramon under Sunarizamon and hand-digivolves for the reduced cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-055", as: "suna" },
            { card: "EX10-063", as: "close" },
          ],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          trash: [{ card: "EX10-028", as: "landramon" }],
          deck: INERT_DECK,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const [entry] = JSON.parse(s.inst("proganomon").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("proganomon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suna").topCard.cardId === CARD_ID);

    // BT21-055's own reduction turns the printed cost of 3 into 2: memory 3 -> 1.
    expect(s.state.memory).toBe(1);
    expect(s.perm("suna").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("landramon").instanceId,
      s.inst("suna").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // The Proganomon left the hand and the digivolution's bonus draw replaced it.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("never places under the OPPONENT's Sunarizamon and needs [Close] in play", async () => {
    const withoutClose = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-055", as: "suna" }],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          trash: [{ card: "EX10-028", as: "landramon" }],
          deck: INERT_DECK,
        },
      },
      { autoSelectCards: true },
    );
    withoutClose.state.memory = 3;
    await withoutClose.ready();
    // "If you have [Close]" gates the whole clause.
    expect(JSON.parse(withoutClose.inst("proganomon").activatableEffectsJson || "[]")).toHaveLength(0);

    const opponentHost = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-063", as: "close" }],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          trash: [{ card: "EX10-028", as: "landramon" }],
          deck: INERT_DECK,
        },
        // The only [Sunarizamon] belongs to the opponent. `resolvePermanentTargets` scans both
        // seats when the host filter names no controller, so the printed "any of YOUR
        // [Sunarizamon]" needs the explicit controller gate.
        1: { battleArea: [{ card: "BT21-055", as: "theirSuna" }], deck: INERT_DECK },
      },
      { autoSelectCards: true },
    );
    opponentHost.state.memory = 3;
    await opponentHost.ready();
    // The activatable list only screens the "If you have [Close]" condition, so the clause is
    // still offered with no legal host. Activating it must be a no-op, not a placement under
    // the opponent's copy: `resolvePermanentTargets` scans BOTH seats when the host filter
    // names no controller, so the printed "any of YOUR [Sunarizamon]" rests on the explicit
    // `controller: "mine"` in `placeCost.hostFilter`.
    const entries = JSON.parse(opponentHost.inst("proganomon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
    }>;
    expect(entries).toHaveLength(1);
    opponentHost.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: opponentHost.inst("proganomon").instanceId,
      effectKey: entries[0]!.effectKey,
    });
    await settle(() => opponentHost.state.pendingDecision === undefined);
    // The opponent's Sunarizamon never becomes a Proganomon and never receives the Landramon.
    expect(opponentHost.perm("theirSuna").topCard.cardId).toBe("BT21-055");
    expect(opponentHost.perm("theirSuna").stack).toHaveLength(0);
    expect(opponentHost.state.players[1]!.battleArea).toHaveLength(1);
    // Nothing was paid and nothing moved: the Landramon is still in the trash and the
    // Proganomon is still in hand.
    expect(opponentHost.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      opponentHost.inst("landramon").instanceId,
    ]);
    expect(opponentHost.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(opponentHost.state.memory).toBe(3);
    expect(opponentHost.state.pendingDecision).toBeUndefined();
  });

  it("Q5092 the [Hand] [Main] clause is self-contained: no other digivolve effect combines with it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-055", as: "suna" },
            { card: "EX10-063", as: "close" },
            // P-107 Defense Training's ＜Delay＞ digivolve ("1 of your Digimon may digivolve into a
            // black Digimon card in your hand ... reduce the cost by 2"). Q5092: it cannot be
            // used together with this card's [Hand] [Main] clause.
            { card: "P-107", as: "training" },
          ],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          trash: [{ card: "EX10-028", as: "landramon" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    // The ordinary digivolution route is still illegal: Sunarizamon is Lv.3 and this card
    // requires a Lv.4 Black source. "Ignoring digivolution requirements" belongs to this
    // card's own clause only, so no other effect can borrow it.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("suna").permanentId,
        instanceId: s.inst("proganomon").instanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.perm("suna").topCard.cardId).toBe("BT21-055");

    // And running this card's own clause with P-107 on the board still pays its own cost:
    // 3 reduced to 2 by Sunarizamon, never 0 through P-107's -2 replacement.
    const [entry] = JSON.parse(s.inst("proganomon").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("proganomon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suna").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
  });

  it("[On Play] through the real playCard intent: trashes a Mineral source and buffs one trait Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-028", as: "costHost", under: [{ card: "EX10-025", as: "cost" }] },
            { card: "EX10-028", as: "target" },
            { card: "BT1-009", as: "near" },
          ],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard.instanceId);
    s.state.memory = 7;
    const targetBase = s.perm("target").currentDP;
    const nearBase = s.perm("near").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proganomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === targetBase + 3000 && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("costHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
    expect(s.perm("near").currentDP).toBe(nearBase);
    expect(observe(s.engine).hasKeyword(s.perm("near"), "Collision")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("near"))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] through the real digivolve intent from a Lv.4 Black source", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-028", as: "source", under: [{ card: "EX10-025", as: "cost" }] }],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("source").topCard.instanceId);
    s.state.memory = 3;
    const handBefore = s.state.players[0]!.hand.length;

    // Printed evolution requirement: Black, Lv.4, cost 3. Landramon is Black Lv.4.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("proganomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    // The digivolve draws 1; the card itself left the hand.
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    // The trait card in the stack was spent as the cost, so only the Landramon remains under it.
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX10-028"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.perm("source").currentDP).toBe(7000 + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Attacking] pays from ANOTHER stack (Q5093) and that trash fires this card's inherited De-Digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "attacker" },
            // The only Mineral/Rock card in any digivolution stack sits under a DIFFERENT
            // Digimon (Q5093), and it is a copy of this card, so paying the cost also proves
            // the inherited clause through the same public attack.
            { card: "EX10-028", as: "costHost", under: [{ card: CARD_ID, as: "cost" }] },
            { card: "BT1-009", as: "near" },
          ],
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "victim", under: [{ card: "BT1-009", as: "victimBase" }] }],
          deck: INERT_DECK,
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(
      s.inst("cost").instanceId,
      s.perm("attacker").topCard.instanceId,
      s.perm("victim").topCard.instanceId,
    );
    const attackerBase = s.perm("attacker").currentDP;
    const nearBase = s.perm("near").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The opponent holds no ＜Blocker＞, so the block window closes on its own and the attack
    // resolves into security without a `declineBlock` intent.
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(true);

    // Cost paid from the other stack.
    expect(s.perm("costHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    // The buff landed on the attacker, not on the non-trait Digimon.
    expect(s.perm("attacker").currentDP).toBe(attackerBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(s.perm("near").currentDP).toBe(nearBase);
    expect(observe(s.engine).hasPierce(s.perm("near"))).toBe(false);
    // Inherited: the trashed copy De-Digivolved the opponent's Lv.4 Digimon by 1.
    expect(s.perm("victim").topCard.instanceId).toBe(s.inst("victimBase").instanceId);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-019");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it('reads "1 of your such Digimon" as the TRAIT, not "has such a card in its digivolution cards"', async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // The discriminating fixture: NO [Mineral]/[Rock] trait of its own, but it does hold a
            // [Mineral] card in its digivolution cards. The rival reading of "such Digimon" ("a
            // Digimon with such a card under it") would make this a legal buff target; the
            // authored reading (the Digimon itself carries the trait) must exclude it. It is
            // listed first in `preferInstanceIds`, so a wrong filter would land the buff here.
            { card: "BT1-019", as: "stackOnly", under: [{ card: "EX10-025", as: "cost" }] },
            { card: "EX10-028", as: "traitTarget" },
          ],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(
      s.inst("cost").instanceId,
      s.perm("stackOnly").topCard.instanceId,
      s.perm("traitTarget").topCard.instanceId,
    );
    s.state.memory = 7;
    const stackOnlyDp = s.perm("stackOnly").currentDP;
    const traitTargetDp = s.perm("traitTarget").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proganomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("traitTarget").currentDP === traitTargetDp + 3000 && s.state.pendingDecision === undefined,
    );

    // The cost may still be paid from that stack (Q5093) — only the TARGET is trait-scoped.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("stackOnly").currentDP).toBe(stackOnlyDp);
    expect(observe(s.engine).hasKeyword(s.perm("stackOnly"), "Collision")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("stackOnly"))).toBe(false);
    expect(s.perm("traitTarget").currentDP).toBe(traitTargetDp + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("traitTarget"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("traitTarget"))).toBe(true);
  });

  it("never spends the OPPONENT's digivolution cards and never buffs their [Mineral] Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          // BT10-062 Golemon is the inert [Mineral] fixture: no main text and no inherited
          // text, so trashing it as the cost cannot delete or move anything by itself.
          battleArea: [{ card: "EX10-028", as: "mine", under: [{ card: "BT10-062", as: "myCost" }] }],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          deck: INERT_DECK,
        },
        1: {
          // A mirror board on the other seat: same [Mineral] trait top card, same [Mineral]
          // card in its digivolution stack. Both of its instances are preferred FIRST, so a
          // cost or target filter that forgot `controller: "mine"` would reach across seats.
          battleArea: [{ card: "BT10-062", as: "theirs", under: [{ card: "BT10-062", as: "theirCost" }] }],
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(
      s.inst("theirCost").instanceId,
      s.perm("theirs").topCard.instanceId,
      s.inst("myCost").instanceId,
      s.perm("mine").topCard.instanceId,
    );
    s.state.memory = 7;
    const mineBase = s.perm("mine").currentDP;
    const theirsBase = s.perm("theirs").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proganomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0 && s.state.pendingDecision === undefined);

    // Cost came from my own stack only.
    expect(s.perm("mine").stack).toHaveLength(0);
    expect(s.perm("theirs").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("theirCost").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("myCost").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    // Buff landed on my Digimon, never on theirs.
    expect(s.perm("mine").currentDP).toBe(mineBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("mine"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("mine"))).toBe(true);
    expect(s.perm("theirs").currentDP).toBe(theirsBase);
    expect(observe(s.engine).hasKeyword(s.perm("theirs"), "Collision")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("theirs"))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the buffs expire when the opponent's turn ends, proved through the real turn loop", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-028", as: "costHost", under: [{ card: "EX10-025", as: "cost" }] },
            { card: "EX10-028", as: "target" },
          ],
          hand: [
            { card: CARD_ID, as: "proganomon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK, security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard.instanceId);
    const targetBase = s.perm("target").currentDP;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proganomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === targetBase + 3000);
    expect(s.perm("target").currentDP).toBe(targetBase + 3000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // Still live during the opponent's turn: the duration runs until that turn ENDS.
    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the optional cost leaves the board untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-028", as: "costHost", under: [{ card: "EX10-025", as: "cost" }] },
            { card: "EX10-028", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const targetBase = s.perm("target").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proganomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0 && s.state.pendingDecision === undefined);

    expect(s.perm("costHost").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------------------
  // Q5092, direct: P-107 Defense Training reaches the board through a public `playCard`, and
  // its ＜Delay＞ clause is activated on a LATER turn through the public `activateEffect`
  // intent (＜Delay＞ may not be used the turn the Option entered play). The two tests below
  // drive that real path instead of only asserting around a dormant P-107.
  // ---------------------------------------------------------------------------------------

  // RED, engine/peer-card seam (NOT this card): P-107.ts's second [Main] effect lists its
  // `Replacement { event: "wouldDigivolve", mode: "reduceCost", amount: 2 }` AFTER the
  // `Digivolve` action in the same `actions` array, so the reduction registers only once the
  // digivolve it is meant to modify has already been paid for. Its own ＜Delay＞ digivolve
  // therefore pays the FULL printed cost (memory 5 -> 2 instead of 5 -> 4), and the armed
  // replacement leaks onto the NEXT digivolution (see the Q5092 leak test below).
  // Seam: apps/api/src/cards/P/P-107.ts, compiled.effects[1].actions — that file is outside
  // this lane's allowed edits, so the assertion is kept exact and the test kept red.
  it.fails("Q5092 P-107's ＜Delay＞, played and activated publicly, reaches this card only by the ORDINARY route", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          // BT3-067 Tankmon: Lv.4 Black, [Cyborg], no printed text — a legal ordinary source for
          // this Lv.5 Black card, and its card carries no [Mineral]/[Rock] trait, so the
          // [When Digivolving] clause finds no cost card and cannot disturb the endpoints.
          battleArea: [{ card: "BT3-067", as: "host" }],
          hand: [
            { card: "P-107", as: "training" },
            { card: CARD_ID, as: "proganomon" },
          ],
          // The [Hand] [Main] clause's own material stays available throughout: if the ＜Delay＞
          // could borrow clause 1, this Landramon would leave the trash.
          trash: [{ card: "EX10-028", as: "landramon" }],
          deck: ["BT2-064", ...INERT_DECK],
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // P-107's reveal-2 adds a black card to hand, so the ＜Delay＞ digivolve sees more than one
    // candidate; bias it onto this card.
    preferred.push(s.inst("proganomon").instanceId, s.perm("host").topCard.instanceId);
    // Capture the id before the play: while the Option resolves it is in no zone, so the alias
    // lookup inside a settle predicate would throw.
    const trainingId = s.inst("training").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    // Public play: P-107's first [Main] clause places the Option itself into the battle area.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trainingId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === trainingId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("host").topCard.cardId).toBe("BT3-067");

    // A later turn: ＜Delay＞ cannot be used on the turn the Option entered play.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const handBefore = s.state.players[0]!.hand.length;
    s.state.memory = 5;
    const ability = JSON.parse(s.perm("training").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(ability).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trainingId,
        effectKey: ability[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === CARD_ID && s.state.pendingDecision === undefined);

    // Endpoints. The digivolution is the ORDINARY one: a legal Lv.4 Black source.
    expect(s.perm("host").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("host").instanceId]);
    // The [Hand] [Main] clause was NOT combined with it: nothing was placed from the trash.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("landramon").instanceId);
    // The Option paid itself as the ＜Delay＞ cost and left the battle area.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === trainingId)).toBe(false);
    // Hand: this card left it, the digivolution's bonus draw replaced it.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("proganomon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    // Asserted last so every endpoint above is still exercised: the printed cost 3 reduced by
    // P-107's own -2 is 1, so memory must go 5 -> 4. Actual: 5 -> 2 (no reduction applied).
    expect(s.state.memory).toBe(4);
  });

  it("Q5092 negative: the activated ＜Delay＞ cannot put this card onto a Lv.3 [Sunarizamon], and the [Hand] [Main] clause still resolves on its own", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-055", as: "suna" },
            { card: "EX10-063", as: "close" },
          ],
          hand: [
            { card: "P-107", as: "training" },
            { card: CARD_ID, as: "proganomon" },
          ],
          trash: [{ card: "EX10-028", as: "landramon" }],
          deck: ["BT2-064", ...INERT_DECK],
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("proganomon").instanceId, s.perm("suna").topCard.instanceId);
    const trainingId = s.inst("training").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trainingId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === trainingId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 3;
    const ability = JSON.parse(s.perm("training").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(ability).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trainingId,
        effectKey: ability[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === trainingId) &&
        s.state.pendingDecision === undefined,
    );

    // P-107's ＜Delay＞ digivolves by the ordinary rules (it does not ignore digivolution
    // requirements), so a Lv.3 [Sunarizamon] can never become this Lv.5 card through it, and
    // this card's own "ignoring digivolution requirements" is not borrowed by it.
    expect(s.perm("suna").topCard.cardId).toBe("BT21-055");
    expect(s.perm("suna").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("proganomon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("landramon").instanceId);
    expect(s.state.memory).toBe(3);

    // The two effects are separate resolutions, never one combined digivolution: with P-107
    // already spent, this card's own [Hand] [Main] clause still works on its own.
    const [entry] = JSON.parse(s.inst("proganomon").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("proganomon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suna").topCard.cardId === CARD_ID);
    // The placement happened: the Landramon left the trash and sits in the stack. The
    // Sunarizamon card is no longer under it because this card's [When Digivolving] clause
    // fired straight away (autoAcceptOptional) and BT21-055 was the only [Mineral] card in the
    // new stack, so it was trashed as that clause's cost.
    expect(s.perm("suna").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("suna").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("landramon").instanceId]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT21-055");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // RED, same peer-card seam as above, and this is the Q5092 breach itself: after P-107's
  // ＜Delay＞ has resolved and the Option has left the battle area, its late-registered -2
  // `wouldDigivolve` replacement is still armed and applies to the NEXT digivolution — this
  // card's own [Hand] [Main] clause. The ruling says the two cannot be used together, so
  // clause 1 must pay 2 (printed 3, reduced 1 by BT21-055) exactly as it does with no P-107
  // on the board (see the Q5091 test); it currently pays 1.
  // Seam: apps/api/src/cards/P/P-107.ts, compiled.effects[1].actions — the Replacement is
  // listed after the Digivolve, so it neither modifies its own digivolve nor expires with it.
  it.fails("Q5092 leak: P-107's spent -2 must not reduce this card's [Hand] [Main] cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-055", as: "suna" },
            { card: "EX10-063", as: "close" },
          ],
          hand: [
            { card: "P-107", as: "training" },
            { card: CARD_ID, as: "proganomon" },
          ],
          trash: [{ card: "EX10-028", as: "landramon" }],
          deck: ["BT2-064", ...INERT_DECK],
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("proganomon").instanceId, s.perm("suna").topCard.instanceId);
    const trainingId = s.inst("training").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trainingId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === trainingId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const ability = JSON.parse(s.perm("training").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trainingId,
        effectKey: ability[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === trainingId) &&
        s.state.pendingDecision === undefined,
    );

    s.state.memory = 3;
    const [entry] = JSON.parse(s.inst("proganomon").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("proganomon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suna").topCard.cardId === CARD_ID);
    // The placement happened: the Landramon left the trash and sits in the stack. The
    // Sunarizamon card is no longer under it because this card's [When Digivolving] clause
    // fired straight away (autoAcceptOptional) and BT21-055 was the only [Mineral] card in the
    // new stack, so it was trashed as that clause's cost.
    expect(s.perm("suna").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("suna").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("landramon").instanceId]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT21-055");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    // Clause 1 pays its own cost 2, exactly as in the Q5091 test: memory 3 -> 1.
    expect(s.state.memory).toBe(1);
  });

  it("peer: EX10-028 Landramon spends the same [Mineral] cost pool but grants ＜Reboot＞/＜Blocker＞, not ＜Collision＞/＜Piercing＞", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-028", as: "costHost", under: [{ card: "BT10-062", as: "cost" }] },
            { card: "EX10-028", as: "target" },
          ],
          hand: [{ card: "EX10-028", as: "peer" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard.instanceId);
    s.state.memory = 4;
    const targetBase = s.perm("target").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("peer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === targetBase + 3000 && s.state.pendingDecision === undefined);

    // Same cost shape (1 [Mineral]/[Rock] card from a digivolution stack) and the same +3000,
    // but the keyword pair is the discriminator between the two cards.
    expect(s.perm("costHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
