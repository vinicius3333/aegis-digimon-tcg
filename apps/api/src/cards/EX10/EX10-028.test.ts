import { getCardDefinition, type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-028.js";

const CARD_ID = "EX10-028";
const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

/**
 * Fixture facts used throughout (verified in cards.json):
 * - BT4-065 Gotsumon: Lv.3 Black, [Rock], play cost 4, 6000 DP, NO effect and NO inherited text.
 *   It is both a legal digivolution source for EX10-028 (Black Lv.3, cost 2) and a legal
 *   trash cost.
 * - BT10-062 Golemon (Lv.4 Black, [Mineral], play cost 5) and BT10-064 Gogmamon (Lv.5 Black,
 *   [Rock], play cost 5) are equally textless.
 * - BT2-011 Vorvomon / BT2-014 Lavorvomon carry the trait "Rock Dragon" and nothing else.
 *   They are the substring trap: "with the [Mineral] or [Rock] trait" is an EXACT trait gate,
 *   so a [Rock Dragon] card is neither a legal cost, nor a legal target, nor a host that arms
 *   the inherited watcher.
 * - BT1-019 DarkTyrannomon (play cost 6) and BT3-067 Tankmon (play cost 6) are textless and
 *   carry the Q5100 boundary.
 */
describe("EX10-028 Landramon", () => {
  it("matches every catalog field and compiles every printed clause", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Landramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // No printed digivolution requirement beyond the catalog EvoCost.
    expect(compiled.digivolutionRequirement).toBeUndefined();

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((candidate) => candidate.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Reboot" },
            duration: "untilOpponentTurnEnd",
            optional: true,
            abortOnDecline: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                // EXACT trait gate, never `traitContains` and never a `texts` substring:
                // "[Rock Dragon]" must not qualify.
                nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
              },
              count: 1,
              bindAs: "chosen",
            },
            cost: {
              kind: "trash",
              target: {
                // "any 1 card": no `kind` restriction, so a Tamer/Option with the trait also pays.
                filter: { controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] },
                from: ["digivolutionCards"],
                count: 1,
              },
            },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
            target: { fromSelectionRef: "chosen" },
          },
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            target: { fromSelectionRef: "chosen" },
          },
        ],
      });
      // All three grants ride one selection: the printed clause names one Digimon.
      expect(effect?.actions).toHaveLength(3);
    }

    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
          },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  // Q5083: the cost may be paid from ANOTHER of your Digimon's digivolution cards.
  // Played through the public `playCard` intent, not injected timing.
  it("Q5083: [On Play] pays from another Digimon's stack and buffs one chosen [Mineral]/[Rock] Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // The cost lives under a DIFFERENT Digimon than the one that will be played.
            { card: "BT10-062", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT10-064", as: "target" },
            // Substring traps: a [Rock Dragon] card in a stack, and a [Rock Dragon] Digimon.
            { card: "BT1-009", as: "trapHost", under: [{ card: "BT2-014", as: "trapCard" }] },
            { card: "BT2-011", as: "trapTarget" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // Preference names the intended cost and target. `preferInstanceIds` only sorts preferred
    // candidates ahead of the rest, so the trap exclusions are proved by the two dedicated
    // negatives below, not by ordering here.
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard!.instanceId);
    s.state.memory = 4;
    const targetBase = s.perm("target").currentDP;
    const trapBase = s.perm("trapTarget").currentDP;
    const costHostBase = s.perm("costHost").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === targetBase + 3000 && s.state.pendingDecision === undefined);

    // Cost: exactly the [Rock] card from the other stack, and only it.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.perm("costHost").stack).toHaveLength(0);
    expect(s.perm("trapHost").stack.map((card) => card.instanceId)).toEqual([s.inst("trapCard").instanceId]);

    // All three grants landed on the ONE chosen Digimon.
    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);

    // Nothing else moved: the [Rock Dragon] Digimon is not a legal target.
    expect(s.perm("trapTarget").currentDP).toBe(trapBase);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Reboot")).toBe(false);
    expect(s.perm("costHost").currentDP).toBe(costHostBase);
    expect(observe(s.engine).hasKeyword(s.perm("costHost"), "Blocker")).toBe(false);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // The printed EvoCost route, through the public `digivolve` intent. The source card itself
  // becomes a digivolution card, so it is the legal cost and Landramon buffs itself.
  it("[When Digivolving] from a Black Lv.3 for 2 memory, paying with its own source card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-065", as: "source" }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const landramonId = s.inst("landramon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: landramonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").currentDP === 4000 + 3000 && s.state.pendingDecision === undefined);

    // The stack identity: Landramon on top, its Gotsumon source trashed as the cost.
    expect(s.perm("source").topCard?.instanceId).toBe(landramonId);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([sourceId]);
    // Printed EvoCost 2, and the digivolution bonus draw landed.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);

    expect(s.perm("source").currentDP).toBe(4000 + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // Illegal digivolution sources: the printed EvoCost is Black Lv.3 only.
  it.each([
    ["a Red Lv.3 source", "BT1-009"],
    ["a Black Lv.4 source", "BT10-062"],
  ])("refuses to digivolve from %s", async (_label, sourceCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sourceCard, as: "source" }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const sourceId = s.inst("source").instanceId;
    const landramonId = s.inst("landramon").instanceId;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("source").permanentId,
      instanceId: landramonId,
    });
    expect(result.ok).toBe(false);

    // Nothing moved: the source keeps its top card and Landramon stays in hand.
    expect(s.perm("source").topCard?.instanceId).toBe(sourceId);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([landramonId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // "until your opponent's turn ends", measured through the real turn loop.
  it("all three grants survive the opponent's whole turn and expire when it ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-062", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT10-064", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY, hand: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard!.instanceId);
    const targetBase = s.perm("target").currentDP;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // Still active during the opponent's turn.
    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the cost pays nothing and grants nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-062", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT10-064", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const targetBase = s.perm("target").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("costHost").stack.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Substring negative for the COST: only [Rock Dragon] cards are available, so the cost is
  // unpayable and the whole clause does nothing even with "yes" answered to everything.
  it("a [Rock Dragon] digivolution card cannot pay the cost, so nothing is granted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "trapHost", under: [{ card: "BT2-014", as: "trapCard" }] },
            { card: "BT10-064", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const targetBase = s.perm("target").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("trapHost").stack.map((card) => card.instanceId)).toEqual([s.inst("trapCard").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Inherited clause, driven entirely by public intents: a second Landramon's [On Play] cost
  // is what trashes this card from a [Mineral] host's digivolution cards.
  it("inherited: being trashed as a cost from a [Mineral] host deletes an opposing play cost 4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [{ card: CARD_ID, as: "buried" }] }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT10-062", as: "costFive" },
            { card: "BT4-065", as: "costFour" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // costFive sorts first: if the play-cost ceiling were wrong it would be deleted instead.
    preferred.push(
      s.inst("buried").instanceId,
      s.perm("costFive").topCard!.instanceId,
      s.perm("costFour").topCard!.instanceId,
    );
    s.state.memory = 4;
    const costFourId = s.perm("costFour").permanentId;
    const costFiveId = s.perm("costFive").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("buried").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([costFiveId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costFourId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT4-065"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // The same inherited clause, on a carrier stack assembled entirely by public intents:
  // Landramon is PLAYED into the battle area, a legal Black Lv.5 [Rock] DIGIVOLVES onto it,
  // and only then is it trashed as another Landramon's [On Play] cost. No `under:` seeding.
  it("inherited: on a carrier stack built by playCard + digivolve, deletes an opposing play cost 4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "carrier" },
            { card: "BT10-064", as: "gogmamon" },
            { card: CARD_ID, as: "landramon" },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT10-062", as: "costFive" },
            { card: "BT4-065", as: "costFour" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const carrierId = s.inst("carrier").instanceId;
    const gogmamonId = s.inst("gogmamon").instanceId;
    const landramonId = s.inst("landramon").instanceId;
    const costFourId = s.perm("costFour").permanentId;
    const costFiveId = s.perm("costFive").permanentId;

    // Step 1 — play the future digivolution card. The board has no stacks yet, so its own
    // [On Play] cost is unpayable and grants nothing; the play itself is what matters.
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: carrierId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === carrierId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    const carrierPermanentId = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === carrierId,
    )!.permanentId;
    const carrier = (): Permanent =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === carrierPermanentId)!;

    // Step 2 — a legal Black Lv.5 [Rock] digivolves onto it for its printed EvoCost 3.
    // Landramon is now a real digivolution card under a [Rock] host, with no `under:` seeding.
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: carrierPermanentId,
        instanceId: gogmamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => carrier().topCard?.instanceId === gogmamonId && s.state.pendingDecision === undefined);
    expect(carrier().stack.map((card) => card.instanceId)).toEqual([carrierId]);
    expect(carrier().currentDP).toBe(8000);
    expect(s.state.memory).toBe(0);
    // EvoCost 3 paid and the digivolution bonus draw landed.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([landramonId, s.inst("drawn").instanceId]);

    // Step 3 — the second Landramon's [On Play] cost trashes the buried one out of that stack.
    // costFive sorts first: a wrong play-cost ceiling would take it instead.
    preferred.push(carrierId, s.perm("costFive").topCard!.instanceId, s.perm("costFour").topCard!.instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    // Exact endpoints: the built stack is emptied, the buried card is the only card in trash,
    // and the inherited delete took the play cost 4 Digimon, not the cost 5 one.
    expect(carrier().topCard?.instanceId).toBe(gogmamonId);
    expect(carrier().stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([carrierId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([costFiveId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costFourId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT4-065"]);
    // The [On Play] grants rode the same public play: the [Rock] host is the chosen Digimon.
    expect(carrier().currentDP).toBe(8000 + 3000);
    expect(observe(s.engine).hasKeyword(carrier(), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(carrier(), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // "When effects trash this card" names no controller. An OPPONENT's effect trashing the
  // card out of a [Mineral] host's digivolution cards fires the same watcher, and the delete
  // still reads "your opponent" from the Landramon owner's side.
  it("inherited: an opponent's BT1-099 Hearts Attack trash fires the watcher against its own caster", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [{ card: CARD_ID, as: "buried" }] }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          hand: [{ card: "BT1-099", as: "heartsAttack" }],
          battleArea: [
            { card: "BT10-062", as: "costFive" },
            { card: "BT4-065", as: "costFour" },
            // BT1-099 is a Blue Option: playing it needs a blue card in play. BT1-042
            // LoaderLeomon is textless and play cost 7, so it never enters the delete pool.
            { card: "BT1-042", as: "blueEnabler" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // costFive sorts first for the same ceiling proof as above.
    preferred.push(s.perm("costFive").topCard!.instanceId, s.perm("costFour").topCard!.instanceId);
    const costFourId = s.perm("costFour").permanentId;
    const costFiveId = s.perm("costFive").permanentId;
    const blueEnablerId = s.perm("blueEnabler").permanentId;
    const buriedId = s.inst("buried").instanceId;
    const optionId = s.inst("heartsAttack").instanceId;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    // The opponent's Option emptied the [Mineral] host's stack, and Landramon's inherited
    // effect deleted one of the CASTER's play cost 4 or less Digimon.
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([buriedId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      costFiveId,
      blueEnablerId,
    ]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costFourId);
    expect([...s.state.players[1]!.trash.map((card) => card.cardId)].sort()).toEqual(["BT1-099", "BT4-065"]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // Substring negative for the TARGET: the only other Digimon on the board carries the
  // [Rock Dragon] trait and is named as the preferred pick, so a `traitContains` gate would
  // visibly buff it instead of Landramon itself.
  it("a [Rock Dragon] Digimon is not a legal target for the three grants", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT2-011", as: "trapTarget" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("trapTarget").topCard!.instanceId);
    s.state.memory = 4;
    const trapBase = s.perm("trapTarget").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 1 &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId),
    );

    const landramon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === landramonId,
    )!;
    // Landramon itself is the only [Mineral]/[Rock] Digimon, so the grants land on it.
    expect(landramon.currentDP).toBe(4000 + 3000);
    expect(observe(s.engine).hasKeyword(landramon, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(landramon, "Reboot")).toBe(true);
    expect(s.perm("trapTarget").currentDP).toBe(trapBase);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Reboot")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["a [Mini Dragon] host", "BT1-009"],
    ["a [Rock Dragon] host, the substring trap", "BT2-011"],
  ])("inherited: silent when trashed from %s", async (_label, hostCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: hostCard, as: "host", under: [{ card: CARD_ID, as: "buried" }] },
            { card: "BT10-064", as: "ally" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "BT4-065", as: "prey" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("buried").instanceId, s.perm("ally").topCard!.instanceId);
    s.state.memory = 4;
    const preyId = s.perm("prey").permanentId;
    const allyBase = s.perm("ally").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === allyBase + 3000 && s.state.pendingDecision === undefined);

    // The Landramon card itself carries the [Mineral] trait, so it IS a legal cost from any
    // stack; only the inherited watcher is gated on the host's trait.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("buried").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([preyId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Q5100: an opposing Digimon whose play cost was reduced from 6 to 4 IS a legal target for
  // the inherited delete. Only the reduction is armed through the Advance Surface's modifier
  // ledger (no card in EX10 reduces an opponent's play cost outside its own trigger); the
  // trash that fires the watcher is still a public [On Play] cost paid by a second Landramon.
  it("Q5100: the inherited delete reads the reduced play cost, not the printed one", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [{ card: CARD_ID, as: "buried" }] }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "reduced" },
            { card: "BT3-067", as: "untouched" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const reducedId = s.perm("reduced").permanentId;
    const untouchedId = s.perm("untouched").permanentId;
    // `untouched` sorts first: both cards are printed play cost 6, so a printed-cost reading
    // would either delete nothing or take the wrong one.
    preferred.push(s.inst("buried").instanceId, s.perm("untouched").topCard!.instanceId);
    // Not `{ continuous: true }`: a continuous adjustment is owned by `clearContinuous()` and
    // the next continuous recompute would erase it before the watcher ever reads a cost.
    advance(s.engine).ledgers.modifiers.addPlayCostAdjustment((facts) => facts.permanentId === reducedId, -2, false);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("buried").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([untouchedId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-019"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
