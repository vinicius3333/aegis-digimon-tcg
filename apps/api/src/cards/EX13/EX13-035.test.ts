import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-035.js";

const cardId = "EX13-035";

// Name-reference fixtures for "[Chuumon], [Sukamon] or [Etemon] in their names". Each was picked
// for a quiet play window so the assertions read this card's clause, not a fixture's.
//   BT3-061  "Chuumon"         — play cost 3; its only printed effect is an [All Turns] memory
//                                restriction, so entering play asks nothing.
//   BT14-034 "Sukamon"         — play cost 3; printed effect is [Security]-only, inert on a play.
//   BT13-069 "KingSukamon"     — play cost 6, the largest single card the printed maximum admits.
//   BT3-070  "Etemon"          — play cost 7 and Lv.5: both the card the base maximum must refuse
//                                and the legal source for the alternate [Digivolve] route.
//   BT13-065 "PlatinumSukamon" — Lv.4 SUBSTRING name match, the illegal-level digivolve source.
//   BT11-063 "Geremon"         — the near-match: it prints "[Sukamon]" inside its own effect TEXT
//                                and is also treated as [Numemon], but its NAME carries neither
//                                token, so `match: "name"` must refuse it.
//   BT1-057  "Sirenmon"        — Yellow Lv.5 with no printed effects: the right level and color
//                                for the printed EvoCost, without either name token.
const CHUUMON_3 = "BT3-061";
const SUKAMON_3 = "BT14-034";
const KING_SUKAMON_6 = "BT13-069";
const ETEMON_7 = "BT3-070";
const PLATINUM_SUKAMON_LV4 = "BT13-065";
const TEXT_ONLY_SUKAMON = "BT11-063";
const UNNAMED_LV5 = "BT1-057";

// Inert main-deck Digimon used as neutral fixtures.
const SENTINEL = "BT1-009";
const OPPONENT_TARGET = "BT1-010";
const OPPONENT_OTHER = "BT1-011";

const nameUnion = (tokens: string[]) => [{ tokens, match: "name" }];

describe("EX13-035 KingEtemon", () => {
  it("matches the catalog printed text, stats and dual evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "KingEtemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Puppet"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 5 },
        { color: "Black", level: 5, memoryCost: 5 },
      ],
    });
    // The printed main text, verbatim, is the contract every test below is written against.
    expect(getCardDefinition(cardId)!.effectText).toBe(
      "[Digivolve] Lv.5 w/[Sukamon]/[Etemon] in name: Cost 4 \n\n" +
        "[On Play] [When Digivolving] You may play up to 2 Digimon cards with [Chuumon], [Sukamon] or [Etemon] in their names and up to 6 total play cost from your hand or trash without paying the costs. By returning 10 such cards from your trash to the bottom of the deck, add 6 to the play cost maximum.\n" +
        "[All Turns] While there are 3 or more Digimon with [Sukamon] or [Etemon] in their names, give all of your opponent's Digimon ＜Security A. -1＞ and -3000 DP.",
    );
    // No printed inherited or security text, so the IR declares neither.
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition(cardId)!.securityEffectText).toBeUndefined();
    expect(compiled.effects.some((effect) => effect.isInherited === true)).toBe(false);
    expect(compiled.effects.some((effect) => effect.isSecurity === true)).toBe(false);
  });

  it("compiles the alternate digivolve header as a substring-name Lv.5 route", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Sukamon", "Etemon"], cost: 4, isAlternate: true },
    ]);
  });

  it("compiles the play clause under both printed timings as one exclusive-branch modal", () => {
    // The aggregate play-cost cap is the one retained red; everything else is covered.
    expect(runtimeCompiledCard(cardId)).toMatchObject({
      coverage: "partial",
      residual: ["[On Play] [When Digivolving] ... and up to 6 total play cost (the across-cards sum)"],
    });

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      // No printed [Once Per Turn] on the line, so neither window carries a frequency.
      expect(effect.frequency).toBeUndefined();
      const modal = effect.actions[0]!;
      // Two exclusive branches, one chosen, the whole clause declinable. The paid branch carries
      // no availability condition: the engine's own `canPayCost` preflight drops it when the
      // trash cannot fund the return (proven behaviourally two tests below).
      expect(modal).toMatchObject({ kind: "Modal", choose: 1, optional: true });
      expect((modal as { optionConditions?: unknown }).optionConditions).toBeUndefined();
      if (modal.kind !== "Modal") throw new Error("expected the play clause to compile to a Modal");
      // Branch 0 is the printed maximum of 6; branch 1 pays the trash return for 6 + 6 = 12.
      // Both cap the card count at 2 and both declare the printed aggregate budget.
      expect(modal.options[0]).toEqual([
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: nameUnion(["Chuumon", "Sukamon", "Etemon"]),
              playCostLte: 6,
            },
            count: 2,
            upTo: true,
            totalPlayCostBudget: 6,
          },
          from: ["hand", "trash"],
          payCost: false,
          raw: expect.any(String),
        },
      ]);
      expect(modal.options[1]![0]).toMatchObject({
        kind: "PlayWithoutCost",
        target: { filter: { playCostLte: 12 }, count: 2, upTo: true, totalPlayCostBudget: 12 },
        from: ["hand", "trash"],
        payCost: false,
        cost: {
          kind: "return",
          to: "deckBottom",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: nameUnion(["Chuumon", "Sukamon", "Etemon"]),
            },
            count: 10,
          },
        },
      });
    }
  });

  it("compiles the conditional debuff as two continuously gated board-wide auras", () => {
    const effect = compiled.effects.find((candidate) => candidate.trigger === "AllTurns")!;
    const gate = {
      kind: "anyHas",
      // "there are 3 or more Digimon" names no controller, so the count spans both players;
      // `zone: "battleArea"` keeps breeding-area Digimon unreferenced (comprehensive §3-4-7-8).
      filter: { zone: "battleArea", kind: ["Digimon"], nameOrTrait: nameUnion(["Sukamon", "Etemon"]) },
      countMin: 3,
      raw: expect.any(String),
    };
    expect(effect.actions).toEqual([
      {
        kind: "Aura",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
        effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security A. -1＞" } },
        while: gate,
        raw: expect.any(String),
      },
      {
        kind: "Aura",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
        effect: { kind: "modifyDP", amount: -3000 },
        while: gate,
        raw: expect.any(String),
      },
    ]);
  });

  // ---------------------------------------------------------------------------
  // [On Play] — the base branch: up to 2 named Digimon cards from hand OR trash, free.
  // ---------------------------------------------------------------------------

  it("plays one named card from hand and one from the trash, refusing the over-cost and text-only cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "king" },
            { card: SUKAMON_3, as: "fromHand" },
          ],
          trash: [
            { card: CHUUMON_3, as: "fromTrash" },
            { card: ETEMON_7, as: "overCost" },
            { card: TEXT_ONLY_SUKAMON, as: "textOnly" },
            { card: SENTINEL, as: "unnamed" },
          ],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    // Bias the selector toward the three cards the clause must REFUSE, so their absence from the
    // battle area is a property of the filter rather than of candidate ordering.
    preferred.push(s.inst("overCost").instanceId, s.inst("textOnly").instanceId, s.inst("unnamed").instanceId);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [cardId, SUKAMON_3, CHUUMON_3].sort(),
    );
    // Both arrived free: the only memory spent is KingEtemon's own printed play cost of 13.
    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    // The cost-7 Etemon exceeds the printed maximum; Geremon carries [Sukamon] only in its TEXT;
    // the sentinel carries no token at all. All three stay in the trash.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("overCost").instanceId,
      s.inst("textOnly").instanceId,
      s.inst("unnamed").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("plays nothing when the controller declines the printed 'You may'", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "king" }],
          trash: [{ card: CHUUMON_3, as: "candidate" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("candidate").instanceId]);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // "By returning 10 such cards from your trash to the bottom of the deck, add 6 to the play
  // cost maximum." The raise is observable through the per-card ceiling: the cost-7 Etemon that
  // the base branch refused above becomes playable.
  // ---------------------------------------------------------------------------

  it("returns ten such cards to the deck bottom and then plays a card the base maximum refuses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "king" },
            { card: ETEMON_7, as: "overBaseCost" },
          ],
          trash: Array.from({ length: 10 }, (_, n) => ({ card: CHUUMON_3, as: `fodder${n}` })),
          deck: [{ card: SENTINEL, as: "deckTop" }],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();
    const fodderIds = Array.from({ length: 10 }, (_, n) => s.inst(`fodder${n}`).instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    // The cost-7 Etemon arrived free: the raised maximum of 12 admits it.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [cardId, ETEMON_7].sort(),
    );
    expect(s.state.memory).toBe(-3);
    // All ten paid cards left the trash and sit UNDER the pre-existing deck card.
    expect(s.state.players[0]!.trash).toHaveLength(0);
    const deck = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    expect(deck[0]).toBe(s.inst("deckTop").instanceId);
    expect(deck.slice(1).sort()).toEqual([...fodderIds].sort());
    assertNoLoudGap(s);
  });

  it("never offers the raised maximum with only nine such cards in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "king" },
            { card: ETEMON_7, as: "overBaseCost" },
          ],
          trash: Array.from({ length: 9 }, (_, n) => ({ card: CHUUMON_3, as: `fodder${n}` })),
          deck: [{ card: SENTINEL, as: "deckTop" }],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle(() => s.state.pendingDecision === undefined);

    // Only the base branch was available, so the cost-7 Etemon stayed in hand and two of the
    // nine cost-3 Chuumon came out of the trash instead. Nothing went to the deck.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("overBaseCost").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [cardId, CHUUMON_3, CHUUMON_3].sort(),
    );
    expect(s.state.players[0]!.trash).toHaveLength(7);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckTop").instanceId]);
    assertNoLoudGap(s);
  });

  // RETAINED RED — the across-cards play-cost sum.
  // Seam: `pickLoose` (apps/api/src/engine/effects/interpreter/targeting/loose.ts:502) resolves a
  // loose-card play target without ever reading `Target.totalPlayCostBudget`, and never passes a
  // `maxTotalPlayCost` to `ctx.ask.selectCards` even though `decisionApi.selectCards`
  // (apps/api/src/engine/decisions/decisionApi.ts:141) already accepts and clamps to one. Only
  // `resolveTotalPlayCostBudgetTargets` (targeting/permanents.ts:305) honors the field, and that
  // path resolves battle-area permanents, not hand/trash cards.
  // Expected: KingSukamon (6) + Chuumon (3) = 9 exceeds the printed maximum of 6, so only one of
  // the two may be played. Actual: both are played, because each clears the per-card ceiling.
  it.fails("caps the combined play cost of the cards it plays at the printed maximum", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "king" }],
          trash: [
            { card: KING_SUKAMON_6, as: "six" },
            { card: CHUUMON_3, as: "three" },
          ],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length >= 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.5 w/[Sukamon]/[Etemon] in name: Cost 4, and [When Digivolving].
  // ---------------------------------------------------------------------------

  it("digivolves from a Lv.5 Etemon for 4, keeps the source in the stack and fires the same clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ETEMON_7, as: "base" }],
          hand: [{ card: cardId, as: "king" }],
          trash: [{ card: SUKAMON_3, as: "fromTrash" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    // Cost 4, not the catalog EvoCost of 5.
    expect(s.state.memory).toBe(6);
    // Source identity: the Lv.5 Etemon survives as the single digivolution card beneath.
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    // Digivolution's bonus draw took the named top deck card.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    // [When Digivolving] ran the same free play out of the trash.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [cardId, SUKAMON_3].sort(),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("charges the printed 5 when the Lv.5 source carries neither name token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: UNNAMED_LV5, as: "base" }],
          hand: [{ card: cardId, as: "king" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    // `useAlternateCost` is a preference, not a gate: with no matching alternate route the engine
    // still takes the printed Yellow Lv.5 EvoCost and returns ok, so the proof is the memory.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
  });

  it("refuses a Lv.4 source even when its name carries [Sukamon]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: PLATINUM_SUKAMON_LV4, as: "base" }],
        hand: [{ card: cardId, as: "king" }],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
      1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("base").topCard.cardId).toBe(PLATINUM_SUKAMON_LV4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("king").instanceId]);
    expect(s.state.memory).toBe(10);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] While there are 3 or more Digimon with [Sukamon] or [Etemon] in their names,
  // give all of your opponent's Digimon ＜Security A. -1＞ and -3000 DP.
  // ---------------------------------------------------------------------------

  it("debuffs every opposing Digimon while three named Digimon stand on either side of the board", async () => {
    const s = setupEngine({
      0: {
        // KingEtemon's own name carries [Etemon], so it is one of the three.
        battleArea: [
          { card: cardId, as: "king" },
          { card: SUKAMON_3, as: "mySukamon" },
        ],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
      1: {
        battleArea: [
          // The third counts even though the OPPONENT controls it: the printed sentence says
          // "there are", not "you have".
          { card: ETEMON_7, as: "theirEtemon", dp: 6000 },
          { card: OPPONENT_TARGET, as: "target", dp: 9000 },
        ],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    for (const alias of ["theirEtemon", "target"]) {
      expect(observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack")).toBe(-1);
    }
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.perm("theirEtemon").currentDP).toBe(3000);
    // "all of your OPPONENT's Digimon": neither of the controller's own Digimon is touched.
    expect(observe(s.engine).keywordAmount(s.perm("mySukamon"), "SecurityAttack")).toBe(0);
    expect(s.perm("mySukamon").currentDP).toBe(getCardDefinition(SUKAMON_3)!.dp);
    expect(s.perm("king").currentDP).toBe(13000);

    // Drop below the threshold: the aura is continuous, so the debuff lifts on its own.
    await advance(s.engine).verb.deletePermanent([s.perm("theirEtemon").permanentId]);
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.perm("target").currentDP).toBe(9000);
  });

  it("does not count a Digimon that carries [Sukamon] only in its text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "king" },
          { card: SUKAMON_3, as: "mySukamon" },
          // Geremon prints [Sukamon] in its effect text and is treated as [Numemon], but its
          // NAME carries neither token, so the board still holds only two named Digimon.
          { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
        ],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
      1: {
        battleArea: [{ card: OPPONENT_OTHER, as: "target", dp: 9000 }],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.perm("target").currentDP).toBe(9000);

    // Swap the near-match for a real third name and the same board now debuffs.
    s.putOnBoard(0, { card: PLATINUM_SUKAMON_LV4, as: "realThird" });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("ignores a breeding-area named Digimon when counting to three", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "king" },
          { card: SUKAMON_3, as: "mySukamon" },
        ],
        // Comprehensive §3-4-7-8: information on cards in breeding areas can't be referenced by
        // an effect that does not name the breeding area, so this third Sukamon does not count.
        breeding: { card: PLATINUM_SUKAMON_LV4, as: "breedingSukamon" },
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
      1: {
        battleArea: [{ card: OPPONENT_TARGET, as: "target", dp: 9000 }],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.perm("target").currentDP).toBe(9000);
  });
});
