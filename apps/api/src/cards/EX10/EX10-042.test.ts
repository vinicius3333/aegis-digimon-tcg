import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-042.js";
import "../index.js";

const CARD_ID = "EX10-042";

/**
 * EX10-042 GulusGammamon (Lv.4 Purple/Red Virus Dragonkin, DP 5000, play cost 5).
 *
 * "[Digivolve] [Gammamon]: Cost 2"
 * "[On Play] [When Digivolving] Trash the top 2 cards of your deck. Then, you may place 1
 *  Digimon card with [Gammamon] in its name from your trash as this Digimon's bottom
 *  digivolution card."
 * "[Your Turn] [Once Per Turn] When effects add to this Digimon's digivolution cards, this
 *  Digimon may digivolve into [Regulusmon] in the hand or trash with the digivolution cost
 *  reduced by 1."
 * Inherited: "＜Raid＞"
 *
 * Every clause below is driven through public intents (`playCard`, `digivolve`,
 * `respondDecision`); no injected timing is used.
 */

/**
 * Answer the next "you may ..." prompt. Both printed "may" clauses raise the same
 * `optional` decision kind, so the test drives them in order instead of using the
 * harness-wide auto flags, which cannot accept one prompt and decline the next.
 */
async function answerOptional(s: EngineSetup, accept: boolean, promptMatch: RegExp): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const pending = s.state.pendingDecision;
  expect(pending?.kind, "an optional prompt was expected").toBe("optional");
  expect(pending!.promptText).toMatch(promptMatch);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending!.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
}

const stackCardIds = (s: EngineSetup, alias: string): string[] => s.perm(alias).stack.map((card) => card.cardId);

describe("EX10-042 GulusGammamon", () => {
  it("records the exact catalog, including the printed clauses this suite proves", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "GulusGammamon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dragonkin"],
      inheritedEffectText: "＜Raid＞",
    });
    expect(getCardDefinition(CARD_ID)!.effectText).toContain(
      "1 Digimon card with [Gammamon]\u00a0in its name from your trash",
    );
  });

  it("compiles the three printed clauses with the right name-match strictness", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gammamon"], cost: 2, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 2 },
          {
            kind: "PlaceUnder",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                // "with [Gammamon] in its name" is a SUBSTRING match, so GulusGammamon,
                // BetelGammamon and KausGammamon all qualify.
                nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
              },
              count: 1,
              from: ["trash"],
            },
            position: "bottom",
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      // "[Your Turn]" and "[Once Per Turn]" are carried onto the installed watcher by
      // `withSubTriggerTurnScope` / `withSubTriggerFrequency` (interpreter/effect.ts).
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Digivolve",
              // Bracketed "[Regulusmon]" is an EXACT name reference (audit fix: the module
              // used the substring "name" mode, which would also catch a future
              // "<X>Regulusmon"). No such card exists today, so this is IR-only evidence.
              into: { nameOrTrait: [{ tokens: ["Regulusmon"], match: "nameExact" }] },
              from: ["hand", "trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Raid" }] });
  });

  it("[On Play]: mills 2, places the trash [Gammamon] card at the stack bottom, then digivolves into Regulusmon for 1 less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          // A second copy on the board proves the watcher's `isSelfRef` gate: only the
          // permanent whose OWN digivolution cards grew may digivolve.
          battleArea: [{ card: CARD_ID, as: "bystander" }],
          hand: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT21-077", as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "mill1" },
            { card: "BT1-009", as: "mill2" },
            { card: "BT1-014", as: "rest" },
          ],
          trash: [
            { card: "LM-016", as: "gammamon" },
            { card: "BT1-013", as: "nonMatch" },
          ],
        },
      },
      // BT21-077 Regulusmon matches this Lv.4 Purple/Red base by BOTH its printed evoCost
      // (Purple/Red Lv.4, cost 4) and its alternate "[Digivolve] Lv.4 w/[Gammamon] in text:
      // Cost 3", so the effect-driven digivolve raises the route `chooseOption`
      // (interpreter/actions/digivolve.ts). Index 0 is the printed route: 4 - 1 = 3 paid.
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("gammamon").instanceId, s.inst("regulus").instanceId);
    s.state.memory = 9;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await answerOptional(s, true, /place/i);
    await answerOptional(s, true, /digivolve/i);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT21-077"));

    const gulus = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT21-077")!;
    // Bottom-most digivolution card first: the trash Gammamon landed UNDER GulusGammamon.
    expect(gulus.stack.map((card) => card.instanceId)).toEqual([
      s.inst("gammamon").instanceId,
      s.inst("gulus").instanceId,
    ]);
    expect(gulus.topCard.instanceId).toBe(s.inst("regulus").instanceId);
    // 9 - 5 (play) - 3 (printed cost 4 reduced by 1) = 1.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("nonMatch").instanceId,
      s.inst("mill1").instanceId,
      s.inst("mill2").instanceId,
    ]);
    // Deck: 2 milled by the [On Play] clause, then the last card drawn as the digivolution
    // bonus draw — the effect-driven digivolve is a real digivolution, not a swap.
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("rest").instanceId,
    ]);
    // `isSelfRef`: the untouched copy did not digivolve and gained nothing.
    expect(s.perm("bystander").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("bystander").stack).toHaveLength(0);
    // ＜Raid＞ reaches the new top card as an inherited effect of the stack built above.
    expect(observe(s.engine).hasKeyword(gulus, "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Raid")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("[When Digivolving] over [Gammamon] for cost 2: mills 2, places, and the Regulusmon digivolve may be declined", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-016", as: "base" }],
          hand: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "mill1" },
            { card: "BT1-009", as: "mill2" },
            { card: "BT1-014", as: "rest" },
          ],
          trash: [
            { card: "BT8-008", as: "gammamon" },
            { card: "BT1-013", as: "nonMatch" },
            { card: "BT21-077", as: "regulus" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("gammamon").instanceId);
    s.state.memory = 5;
    await s.ready();

    // The alternate "[Digivolve] [Gammamon]: Cost 2" route, not the printed Purple/Red Lv.3
    // evoCost of 3.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gulus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await answerOptional(s, true, /place/i);
    await answerOptional(s, false, /digivolve/i);
    await settle(() => stackCardIds(s, "base").length === 2);

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("gulus").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
      s.inst("gammamon").instanceId,
      s.inst("base").instanceId,
    ]);
    // 5 - 2 (alternate cost), not 5 - 3 (printed evoCost).
    expect(s.state.memory).toBe(3);
    // The digivolution bonus draw takes `mill1` first, so the [When Digivolving] clause
    // trashes the two cards behind it.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("mill1").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("nonMatch").instanceId,
      s.inst("regulus").instanceId,
      s.inst("mill2").instanceId,
      s.inst("rest").instanceId,
    ]);
    // Declined: Regulusmon stayed in the trash and no memory was paid for it.
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses an illegal digivolution source: a green Lv.3 base, and the [Gammamon] route from a non-Gammamon base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "green" },
          { card: "BT1-009", as: "red" },
        ],
        hand: [{ card: CARD_ID, as: "gulus" }],
        deck: ["BT1-013", "BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    // BT1-064 Goblimon is a GREEN Lv.3: no printed evoCost and no alternate route match.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("gulus").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    // BT1-009 Monodramon is a legal RED Lv.3 base for the printed cost of 3, but it is not
    // named Gammamon, so the cost-2 alternate route must be refused.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("red").permanentId,
        instanceId: s.inst("gulus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(s.perm("green").topCard.cardId).toBe("BT1-064");
    expect(s.perm("red").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("gulus").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("places nothing when the trash holds no [Gammamon]-named Digimon, so the Regulusmon watcher never fires", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT21-077", as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "mill1" },
            { card: "BT1-009", as: "mill2" },
            { card: "BT1-014", as: "rest" },
          ],
          trash: [{ card: "BT1-013", as: "nonMatch" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);

    const gulus = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === CARD_ID)!;
    // No placement, so no digivolution-card addition and no Regulusmon digivolve: the
    // milled BT1-013 / BT1-009 are not [Gammamon]-named Digimon.
    expect(gulus.stack).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("regulus").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  /**
   * Two public sources of "effects add to this Digimon's digivolution cards" that can both
   * land under a Purple/Red Lv.4 Dragonkin in the same turn:
   *
   * - BT9-109 X Antibody: "[Main] Place this card under 1 of your Digimon without
   *   [X Antibody] in its digivolution cards as its bottom digivolution card." Cost 0, and
   *   its own [Static] waives the colour requirement while you have a Digimon in play. The
   *   receiver filter is unrestricted apart from the X Antibody exclusion, so it can only be
   *   used ONCE on the same host.
   * - EX6-065 Mythical Arms of Salvation!: "[Main] You may place 1 Digimon card with the
   *   [Legend-Arms] trait from your trash as 1 of your Digimon's bottom digivolution card."
   *   Cost 3, red (GulusGammamon is Purple/Red), receiver unrestricted. P-097 Zubamon and
   *   ST13-02 Zubamon are the [Legend-Arms] Digimon it places.
   *
   * Declining the inner `Digivolve` does NOT refund the gate: the IR sets no
   * `preserveOncePerTurnOnDecline`, so `runAction.ts:766` leaves
   * `oncePerTurnActivationDeclined` unset and `subtriggers.ts:588` keeps the provisional
   * `markFired`. That matches comprehensive §15-14-1 — the watcher activated, the player
   * merely declined the digivolution it offered.
   */
  it("[Once Per Turn]: a second same-turn placement offers nothing, and the next own turn resets it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gulus" },
            // EX6-065 is Red/Black; GulusGammamon covers only red. Its own [Static] waives
            // the colour requirement "while you have a Digimon with the [Legend-Arms] trait",
            // which this inert-on-board P-097 Zubamon supplies.
            { card: "P-097", as: "legend" },
          ],
          hand: [
            { card: "BT9-109", as: "xAntibody" },
            { card: "EX6-065", as: "arms1" },
            { card: "EX6-065", as: "arms2" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: [
            { card: "P-097", as: "zuba1" },
            { card: "ST13-02", as: "zuba2" },
            { card: "BT21-077", as: "regulus" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    // Two Digimon are now legal receivers; steer every placement onto GulusGammamon.
    preferred.push(s.perm("gulus").permanentId, s.perm("gulus").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    // Placement 1 — BT9-109's mandatory [Main] placement. The watcher fires and offers the
    // Regulusmon digivolve; DECLINE it, which still spends the [Once Per Turn] use.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xAntibody").instanceId })).toEqual({
      ok: true,
    });
    await answerOptional(s, false, /digivolve/i);
    await settle(() => s.perm("gulus").stack.length === 1 && s.state.pendingDecision === undefined);
    expect(stackCardIds(s, "gulus")).toEqual(["BT9-109"]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);

    // Placement 2 — EX6-065 places P-097 Zubamon from the trash under the SAME Digimon.
    const decisionsBefore = s.decisions.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arms1").instanceId })).toEqual({ ok: true });
    await answerOptional(s, true, /plac/i);
    await settle(() => s.perm("gulus").stack.length === 2 && s.state.pendingDecision === undefined);

    // The cards DID reach the stack, so the watcher's event fired a second time...
    expect(stackCardIds(s, "gulus")).toEqual(["BT9-109", "P-097"]);
    // ...and the gate refused it: no second "digivolve into Regulusmon?" prompt was opened.
    expect(
      s.decisions
        .slice(decisionsBefore)
        .filter((entry) => entry.req.kind === "optional" && /digivolve/i.test(entry.req.promptText ?? "")),
    ).toEqual([]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("regulus").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    // Next own turn through the real turn loop: the gate has reset.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    // Placement 3 — the second EX6-065 places ST13-02 Zubamon under the same Digimon.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arms2").instanceId })).toEqual({ ok: true });
    await answerOptional(s, true, /plac/i);
    // The offer is back on the new turn; decline again so the board stays comparable.
    await answerOptional(s, false, /digivolve/i);
    await settle(() => s.perm("gulus").stack.length === 3 && s.state.pendingDecision === undefined);

    expect(stackCardIds(s, "gulus")).toEqual(["BT9-109", "P-097", "ST13-02"]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("regulus").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * The `[Your Turn]` half. BT11-088 Bagramon's [On Play] reads "If your opponent has 2 or
   * more Digimon in play, place 1 of your opponent's Digimon under 1 of your opponent's other
   * Digimon as its bottom digivolution card" — an OPPONENT effect that adds a digivolution
   * card to MY GulusGammamon, resolved on THEIR turn. The watcher must stay silent.
   */
  it("[Your Turn]: an opponent's effect placing cards under it on their turn offers nothing", async () => {
    const preferred: string[] = [];
    // Bagramon's cost of 12 pushes the gauge past 0, so the turn passes as soon as the
    // resolution finishes. Record the turn seat AT the placement instead of after it.
    const placementTurnSeats: { instanceIds: string[]; turnSeat: number }[] = [];
    let liveState: { turnSeat: number } | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT1-009", as: "victim" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          trash: [{ card: "BT21-077", as: "regulus" }],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: [
            { card: "BT11-088", as: "bagramon" },
            { card: "BT1-013", as: "theirSpare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      {
        autoSelectCards: true,
        autoChooseOption: true,
        autoAcceptOptional: true,
        preferInstanceIds: preferred,
        onEvent: (event) => {
          if (event.kind === "cardsMoved" && event.to === Zone.BattleArea && liveState !== undefined) {
            placementTurnSeats.push({ instanceIds: [...event.instanceIds], turnSeat: liveState.turnSeat });
          }
        },
      },
    );
    liveState = s.state;
    // Bagramon chooses WHICH of my Digimon is buried; steer it onto the inert BT1-009 so the
    // receiver is GulusGammamon.
    preferred.push(s.perm("victim").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // `state.memory` is TURN-player relative (MemoryGauge.pay), so on seat 1's turn a
    // positive gauge is theirs. 10 is the cap; Bagramon's cost of 12 is still payable
    // because the floor is -10.
    s.state.memory = 10;

    const decisionsBefore = s.decisions.length;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gulus").stack.length === 1 && s.state.pendingDecision === undefined);

    // The placement happened, on the opponent's turn, by the opponent's effect...
    expect(
      placementTurnSeats
        .filter((entry) => entry.instanceIds.includes(s.perm("gulus").stack[0]!.instanceId))
        .map((entry) => entry.turnSeat),
    ).toEqual([1]);
    expect(stackCardIds(s, "gulus")).toEqual(["BT1-009"]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);
    // ...and the [Your Turn] gate kept the Regulusmon offer shut.
    expect(
      s.decisions
        .slice(decisionsBefore)
        .filter((entry) => entry.req.kind === "optional" && /digivolve/i.test(entry.req.promptText ?? "")),
    ).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("regulus").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
