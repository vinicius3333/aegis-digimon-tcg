import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-033.js";
import "../index.js";

/**
 * EX10-033 Pyramidimon (Black Lv.6 Mega, [Mineral] [LIBERATOR]).
 *
 * Every clause below is driven by public intents (`digivolve`, `attack`, `declineBlock`,
 * `respondDecision`) through the real turn loop. The card's two triggers are
 * `[When Digivolving]` and `[When Attacking]`, and both windows open naturally, so no
 * injected timing (`advance.fire*`) is used anywhere in this file.
 *
 * Fixture cards, all textless so they cannot open a decision of their own:
 * BT10-064 Gogmamon (Black Lv.5 [Rock]) — the legal digivolution source and a trashable
 * [Rock] card; BT10-062 Golemon (Lv.4 [Mineral]); BT4-065 Gotsumon (Lv.3 [Rock]);
 * BT3-067 Tankmon (Black Lv.4, play cost 6) as the opponent's target;
 * BT1-009 Monodramon ([Mini Dragon]) as the near-miss the trait filter must skip.
 */

const MINERAL_ROCK_TRASH = [
  { card: "BT10-062", as: "mineral" },
  { card: "EX10-003", as: "egg" },
  { card: "BT4-065", as: "rock" },
  { card: "BT1-009", as: "nearMiss" },
];

describe("EX10-033 Pyramidimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition("EX10-033")).toMatchObject({
      cardId: "EX10-033",
      nameEn: "Pyramidimon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
      maxCountInDeck: 4,
    });
    const definition = getCardDefinition("EX10-033")!;
    // Catalog quirk: both "[Rock]\u00A0trait" spaces are non-breaking (U+00A0), not U+0020.
    // Kept literal so the assertion documents the stored bytes instead of hiding them.
    expect(definition.effectText).toBe(
      "＜Fragment (3)＞ \n[When Digivolving] [When Attacking] [Once Per Turn] You may place up to 3 [Mineral] or [Rock]\u00A0trait cards from your trash as this Digimon's bottom digivolution cards.\n[When Digivolving] [When Attacking] By trashing up to 3 [Mineral] or [Rock]\u00A0trait cards from any of your Digimon's digivolution cards, to 1 of your opponent's Digimon, reduce the play cost by 2 until their turn ends for each card trashed.",
    );
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("records the compiled IR: Fragment, the shared once-per-turn placement, the scaled reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fragment", amount: 3 }],
    });

    const placeEffects = compiled.effects?.filter((effect) => effect.actions?.[0]?.kind === "PlaceUnder");
    expect(placeEffects?.map((effect) => [effect.trigger, effect.frequency, effect.sharedUseKey])).toEqual([
      ["WhenDigivolving", "OncePerTurn", "ir-shared-0"],
      ["WhenAttacking", "OncePerTurn", "ir-shared-0"],
    ]);
    for (const effect of placeEffects ?? []) {
      expect(effect.optional).toBe(true);
      expect(effect.actions?.[0]).toMatchObject({
        kind: "PlaceUnder",
        position: "bottom",
        target: {
          filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
          count: 3,
          upTo: true,
          // Q5096: "up to 3" still demands at least 1 once the effect is activated.
          minimum: 1,
          from: ["trash"],
        },
      });
    }

    const reductions = compiled.effects?.filter((effect) => effect.actions?.[0]?.kind === "CostModifier");
    expect(reductions?.map((effect) => [effect.trigger, effect.frequency])).toEqual([
      // No [Once Per Turn] on the second clause: it may fire on the digivolve AND the attack.
      ["WhenDigivolving", undefined],
      ["WhenAttacking", undefined],
    ]);
    for (const effect of reductions ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "CostModifier",
        mode: "reduce",
        costType: "play",
        amount: 2,
        existingPermanent: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        duration: "untilOpponentTurnEnd",
        cost: {
          kind: "trash",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
            },
            count: 3,
            upTo: true,
            // Q5099: activating the clause forces at least 1 card to be trashed.
            minimum: 1,
            from: ["digivolutionCards"],
          },
        },
        // "for each card trashed" is the cost's paid count, not a board count.
        scaling: { per: 1, usePaidCount: true, unit: "cards" },
        abortOnDecline: true,
      });
    }
  });

  it("Q5095/Q5096: digivolving places up to 3 [Mineral]/[Rock] cards, a Digi-Egg included, at the bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: "EX10-033", as: "pyramid" }],
          deck: ["BT1-013", "BT1-014"],
          // EX10-003 Tumblemon is a [Rock] Digi-Egg: Q5095 allows it as a placement source.
          trash: MINERAL_ROCK_TRASH,
        },
        // No opposing Digimon, so the second clause has no legal target and stays silent;
        // this test measures the placement alone.
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("mineral").instanceId, s.inst("egg").instanceId, s.inst("rock").instanceId);
    await s.ready();
    s.state.memory = 4;
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 4);

    const evolved = s.perm("base");
    expect(evolved.topCard!.cardId).toBe("EX10-033");
    expect(observe(s.engine).hasKeyword(evolved, "Fragment")).toBe(true);
    // Black Lv.5 -> Lv.6 for 3 memory, plus the digivolve bonus draw.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);

    // "bottom digivolution cards": the three placed cards sit BELOW the original source.
    expect(evolved.stack.map((card) => card.instanceId).slice(3)).toEqual([baseInstanceId]);
    expect(
      evolved.stack
        .slice(0, 3)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("mineral").instanceId, s.inst("egg").instanceId, s.inst("rock").instanceId].sort());
    // The [Mini Dragon] near-miss is the only card left in the trash.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);

    // Q5096: once activated the selection demands at least 1 card and caps at 3.
    const placement = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && (req.options?.candidateInstanceIds ?? []).length === 3,
    );
    expect(placement?.req.options).toMatchObject({ min: 1, max: 3 });
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5096/Q5099: declining the optional placement still pays the mandatory reduction with every eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-064", as: "base" },
            { card: "BT10-062", as: "otherHost", under: [{ card: "BT4-065", as: "rockA" }] },
          ],
          hand: [{ card: "EX10-033", as: "pyramid" }],
          deck: ["BT1-013", "BT1-014"],
          trash: MINERAL_ROCK_TRASH,
        },
        1: { battleArea: [{ card: "BT3-067", as: "tankmon" }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const baseInstanceId = s.inst("base").instanceId;
    const rockAInstanceId = s.inst("rockA").instanceId;
    const tankmonPermanentId = s.perm("tankmon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX10-033");
    await settle(() => false, 40);

    // Clause 2 ("You may place…") is the only optional part: declined, so no card left the
    // trash and neither stack gained a card. The trash assertion below still opens with the
    // 4 seeded cards in their seeded order.
    // Clause 3 carries no "You may": it is mandatory, and "up to 3" means it pays with as
    // many eligible cards as exist — here 2, the Lv.5 [Rock] source now under Pyramidimon
    // and the [Rock] card under the other Digimon. Both stacks are emptied.
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([]);
    expect(s.perm("otherHost").stack.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([
      "BT10-062",
      "EX10-003",
      "BT4-065",
      "BT1-009",
      "BT10-064",
      "BT4-065",
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([baseInstanceId, rockAInstanceId]),
    );

    // "for each card trashed": 2 cards paid = -4, so the printed cost 6 reads 2.
    const modifiers = advance(s.engine).ledgers.modifiers;
    const tankmon = getCardDefinition("BT3-067")!;
    expect(modifiers.playCostFor({ def: tankmon, controllerSeat: 1, permanentId: tankmonPermanentId }, 6)).toBe(2);

    // Black Lv.5 -> Lv.6 for 3 memory plus the digivolve bonus draw; nothing else moved.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5097/Q5098/Q5100: trashes 3 cards across two stacks, drops a cost-6 Digimon to 0 and lets Landramon delete it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // EX10-028 Landramon rides the digivolve source, so trashing it off the evolved
            // [Mineral] Pyramidimon arms its inherited "delete a play cost 4 or less" clause.
            { card: "BT10-064", as: "base", under: [{ card: "EX10-028", as: "landramon" }] },
            {
              card: "BT10-062",
              as: "otherHost",
              under: [
                { card: "BT4-065", as: "rockA" },
                { card: "BT4-065", as: "rockB" },
              ],
            },
          ],
          hand: [{ card: "EX10-033", as: "pyramid" }],
          deck: ["BT1-013", "BT1-014"],
          // Nothing eligible in the trash, so the first clause never prompts here.
          trash: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT3-067", as: "chosen" },
            { card: "BT3-067", as: "spared" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("landramon").instanceId,
      s.inst("rockA").instanceId,
      s.inst("rockB").instanceId,
      s.perm("chosen").topCard!.instanceId,
    );
    await s.ready();
    s.state.memory = 4;
    const chosenPermanentId = s.perm("chosen").permanentId;
    const sparedPermanentId = s.perm("spared").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 40);

    // Q5098: the 3 trashed cards came from TWO different Digimon's digivolution cards.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("landramon").instanceId, s.inst("rockA").instanceId, s.inst("rockB").instanceId]),
    );
    expect(s.perm("otherHost").stack).toHaveLength(0);

    // Q5097 + Q5100: 3 cards trashed = -6 play cost on the chosen Digimon only. Its printed
    // cost is 6, so it is now a legal target for Landramon's inherited "play cost of 4 or
    // less" deletion, and the untouched twin is not.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([sparedPermanentId]);
    const modifiers = advance(s.engine).ledgers.modifiers;
    const tankmon = getCardDefinition("BT3-067")!;
    expect(modifiers.playCostFor({ def: tankmon, controllerSeat: 1, permanentId: sparedPermanentId }, 6)).toBe(6);
    // Q5097's "the minimum value is 0" is asserted on the ledger because no card effect can
    // distinguish a stored -1 from 0; the engine floor itself is covered by
    // engine/effects/modifiers.test.ts ("playCostFor reduces a matching play cost and floors at 0").
    expect(modifiers.playCostFor({ def: tankmon, controllerSeat: 1, permanentId: chosenPermanentId }, 5)).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Once Per Turn] is shared by both triggers: digivolving spends it, the same turn's attack cannot place, next turn can", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: "EX10-033", as: "pyramid" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          trash: [
            { card: "BT10-062", as: "first" },
            { card: "BT4-065", as: "second" },
            { card: "BT10-062", as: "third" },
            { card: "BT4-065", as: "fourth" },
            { card: "BT10-062", as: "fifth" },
            { card: "BT4-065", as: "sixth" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
        // No opposing Digimon: the second clause never prompts, so every decision in this
        // test belongs to the placement under audit.
        1: { security: ["BT1-009", "BT1-013", "BT1-014"], deck: ["BT1-009", "BT1-013"], hand: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 4);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId !== "BT1-009")).toHaveLength(3);

    // Same turn, real attack: the [When Attacking] face of the SAME once-per-turn use.
    const stackAfterDigivolve = s.perm("base").stack.length;
    const trashAfterDigivolve = s.state.players[0]!.trash.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The opponent controls no Digimon, so there is no blocker and no block window to
    // decline; the attack runs straight into security.
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() => false, 40);

    expect(s.perm("base").stack).toHaveLength(stackAfterDigivolve);
    expect(s.state.players[0]!.trash).toHaveLength(trashAfterDigivolve);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Next own turn: the gate has reset, so this attack places the remaining 3 cards.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === stackAfterDigivolve + 3);

    expect(s.state.players[0]!.trash.filter((card) => card.cardId !== "BT1-009")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses an illegal digivolution source: a Red Lv.3 is neither Black nor Lv.5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redRookie" }],
        hand: [{ card: "EX10-033", as: "pyramid" }],
        deck: ["BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redRookie").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redRookie").topCard!.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(6);
  });

  /**
   * Q5094: both clauses trigger simultaneously on the digivolve, so the player picks the
   * activation order. The order is observable here because the 1st clause feeds the 2nd:
   * cards it places as digivolution cards become legal trash material for the reduction.
   *
   * Board: the only [Rock]/[Mineral] digivolution card before either clause runs is the
   * digivolution source BT10-064 Gogmamon itself, and the trash holds 3 more.
   */
  const orderingBoard = () => ({
    0: {
      battleArea: [{ card: "BT10-064", as: "base" }],
      hand: [{ card: "EX10-033", as: "pyramid" }],
      deck: ["BT1-013", "BT1-014"],
      trash: [
        { card: "BT10-062", as: "mineral" },
        { card: "BT4-065", as: "rock" },
        { card: "BT10-062", as: "mineral2" },
      ],
    },
    1: { battleArea: [{ card: "BT3-067", as: "tankmon" }], security: ["BT1-009"] },
  });

  it("Q5094: the order choice is offered, and placing first gives the reduction 3 cards to trash", async () => {
    const s = setupEngine(orderingBoard(), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      // Compiled effect keys: "ir-shared-0" is the once-per-turn placement (it carries the
      // shared use key), "ir-7-1" is the play-cost reduction.
      preferTriggerKeys: ["EX10-033/ir-shared-0"],
    });
    await s.ready();
    s.state.memory = 4;
    const tankmonPermanentId = s.perm("tankmon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    await settle(() => false, 40);

    // The player was asked: both effects are offered as separately addressable keys.
    const ordering = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(ordering?.req.options?.triggerKeys?.length).toBe(2);
    expect((ordering?.req.options?.triggerKeys ?? []).map((key) => key.split("::")[1]).sort()).toEqual([
      "EX10-033/ir-7-1",
      "EX10-033/ir-shared-0",
    ]);

    // Placement first: 3 trash cards joined Gogmamon under the top card (4), then the
    // reduction trashed its cap of 3, leaving 1.
    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    const modifiers = advance(s.engine).ledgers.modifiers;
    const tankmon = getCardDefinition("BT3-067")!;
    expect(modifiers.playCostFor({ def: tankmon, controllerSeat: 1, permanentId: tankmonPermanentId }, 6)).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  /**
   * RETAINED RED — engine seam `any-digimon-digivolution-trash-cost-ignores-upTo`.
   *
   * Where: apps/api/src/engine/effects/interpreter/costs.ts, the "By trashing N card(s) from
   * ANY of your Digimon's digivolution cards" branch (`payCost`, the block introduced by
   * `const zones = trashStackZone === undefined ? ["digivolutionCards"] : zoneList(...)`).
   * It computes `const n = cost.target.count === "all" ? candidates.length : cost.target.count`
   * and then bails with `if (n <= 0 || candidates.length < n) return false`, never reading
   * `cost.target.upTo` or `cost.target.minimum`. The neighbouring `isSelfRef` branch does
   * handle `upTo` (the ＜Digi-Burst up to N＞ path), so the gap is specific to the
   * "any of your Digimon's" shape this card prints.
   *
   * Expected (card text + Q5099): "up to 3" with at least 1 mandatory — with a single
   * eligible [Rock] digivolution card the clause trashes that 1 card and reduces the
   * opponent's play cost by 2.
   * Actual: the cost is treated as a fixed 3, `candidates.length (1) < n (3)` fails, and the
   * whole clause silently does nothing — no selection prompt, no reduction.
   *
   * The same root cause also removes the player's choice on the other side: with 4 eligible
   * cards the engine always takes exactly 3 and never offers a 1- or 2-card payment.
   *
   * Ordering matters here for the same reason Q5094 does: resolving the reduction BEFORE the
   * placement leaves only the digivolution source BT10-064 Gogmamon as legal material.
   */
  it("Q5094/Q5099: reduction first still pays with the single eligible card for -2", async () => {
    const s = setupEngine(orderingBoard(), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferTriggerKeys: ["EX10-033/ir-7-1"],
    });
    await s.ready();
    s.state.memory = 4;
    const tankmonPermanentId = s.perm("tankmon").permanentId;
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 4);
    await settle(() => false, 40);

    // Gogmamon paid the cost, so it is no longer a digivolution card.
    expect(s.perm("base").stack.map((card) => card.instanceId)).not.toContain(baseInstanceId);
    const modifiers = advance(s.engine).ledgers.modifiers;
    const tankmon = getCardDefinition("BT3-067")!;
    expect(modifiers.playCostFor({ def: tankmon, controllerSeat: 1, permanentId: tankmonPermanentId }, 6)).toBe(4);
  });
});
