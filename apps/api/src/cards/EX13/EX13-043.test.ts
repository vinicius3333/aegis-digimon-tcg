import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX13-043.js";

const cardId = "EX13-043";

// Fixtures, and why each one is here:
//   BT4-057  GrapLeomon      GREEN Lv.5 [Beastkin], 6000 DP, play cost 7. Its only printed clause
//                            is "[When Attacking] Gain 1 memory", which never fires in these
//                            flows, so it triples as the printed-EvoCost base, the Assembly Lv.5
//                            slot and the play-branch hand card whose cost 7 makes every
//                            reduction arithmetic visible.
//   BT8-052  Drimogemon      GREEN Lv.4 [Beast], 5000 DP, cost 5, no printed text — Assembly Lv.4
//                            slot, and the second trait of the printed disjunction.
//   BT9-045  Elecmon         GREEN Lv.3 [Mammal], 4000 DP, cost 3, no printed text — Assembly Lv.3
//                            slot, and the first trait of the printed disjunction.
//   BT4-050  Liollmon        GREEN Lv.3 [Holy Beast], 5000 DP, no printed text — the NEAR-match
//                            trait negative: "Beast" sits INSIDE its trait, which exact
//                            "w/[Beast] trait" matching must still refuse.
//   BT1-065  Mushroomon      GREEN Lv.3 [Vegetation], no printed text — the plain trait negative.
//   BT1-045  Tsukaimon       YELLOW Lv.3 [Mammal], no printed text — the Assembly COLOUR negative.
//   BT13-058 Leopardmon:     GREEN Lv.6, the exact [Digivolve] name route's only printing. Its own
//            Leopard Mode    clauses all need a timing window none of these flows opens.
//   BT13-056 Leopardmon      GREEN Lv.6 — the substring negative: "Leopardmon" is a prefix of
//                            "Leopardmon: Leopard Mode", and `namesExact` must still refuse it.
//   EX2-052  ADR-06 Horn     WHITE Digimon, 7000 DP, inert without a [Mother D-Reaper] — the white
//            Striker         colour source an Option's colour requirement needs (context.ts
//                            `optionColorRequirementMet`).
//   BT13-110 Royal Knights   WHITE Option, use cost 6, [Royal Knight] trait — the only printed
//            of the Purge    trait on the use side of this clause with a cost above the flat -4,
//                            which is what makes the reduction observable in memory.
//   BT1-009..BT1-014         inert red main-deck Digimon — neutral deck, security, hand bulk and
//                            DP bodies. None of them carries any of the four printed traits.
const GREEN_BEASTKIN_LV5 = "BT4-057";
const GREEN_BEAST_LV4 = "BT8-052";
const GREEN_MAMMAL_LV3 = "BT9-045";
const NEAR_TRAIT_LV3 = "BT4-050";
const NO_TRAIT_LV3 = "BT1-065";
const OFF_COLOUR_MAMMAL_LV3 = "BT1-045";
const LEOPARD_MODE = "BT13-058";
const PLAIN_LEOPARDMON = "BT13-056";
const WHITE_SOURCE = "EX2-052";
const ROYAL_KNIGHT_OPTION = "BT13-110";
const DECK = ["BT1-011", "BT1-012", "BT1-013"];

/** Fire the [When Attacking] window on a permanent without running a whole combat (EX13-012). */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-043 Leopardmon", () => {
  it("matches the catalog identity and printed text", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Leopardmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12_000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
    });
    expect((getCardDefinition(cardId)?.inheritedEffectText ?? "").trim()).toBe("");
    expect((getCardDefinition(cardId)?.securityEffectText ?? "").trim()).toBe("");

    const effectText = getCardDefinition(cardId)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] [Leopardmon: Leopard Mode]: Cost 1");
    expect(effectText).toContain("[Assembly -5] Lv.5 × Lv.4 × Lv.3, all Green w/[Mammal]/[Beast]/[Beastkin] trait");
    expect(effectText).toContain(
      "[On Play] [When Digivolving] You may suspend 1 Digimon. Then, you may return 1 of your opponent's lowest DP Digimon to the bottom of the deck.",
    );
    expect(effectText).toContain(
      "[When Digivolving] [When Attacking] [Once Per Turn] You may play or use 1 [Mammal], [Beast], [Beastkin] or [Royal Knight] trait card from your hand with the cost reduced by 4. For each suspended Digimon, further reduce it by 1.",
    );
    expect(effectText).toContain(
      "[All Turns] [Once Per Turn] When any of your suspended Digimon would leave the battle area other than by your effects, by unsuspending 1 of your Digimon, they don't leave.",
    );
  });

  it("compiles every printed clause and nothing else", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({
      coverage: "full",
      residual: [],
    });
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "OnPlay",
      "WhenDigivolving",
      "WhenDigivolving",
      "WhenAttacking",
      "AllTurns",
    ]);

    const suspendAndBounce = [
      {
        kind: "Suspend",
        target: { count: 1, filter: { controller: "any", kind: ["Digimon"], unsuspended: true } },
        optional: true,
      },
      {
        kind: "Return",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" } },
        to: "deckBottom",
        optional: true,
      },
    ];
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: suspendAndBounce });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving", actions: suspendAndBounce });
    // No [Once Per Turn] is printed on the suspend/bounce line.
    expect(compiled.effects[0]!.frequency).toBeUndefined();
    expect(compiled.effects[1]!.frequency).toBeUndefined();

    const traitGate = [{ tokens: ["Mammal", "Beast", "Beastkin", "Royal Knight"], match: "trait" }];
    const perSuspended = {
      per: 1,
      filter: { controllerDefault: "any", kind: ["Digimon"], suspended: true },
      unit: "cards",
    };
    const playOrUse = [
      {
        kind: "Modal",
        choose: 1,
        options: [
          [
            {
              kind: "PlayWithoutCost",
              target: {
                count: 1,
                filter: { zone: "hand", kind: ["Digimon", "Tamer"], nameOrTrait: traitGate },
              },
              from: ["hand"],
              payCost: true,
              reduceCostBy: 4,
              reduceCostByScaling: perSuspended,
              optional: true,
            },
          ],
          [
            {
              kind: "UseOptionWithoutCost",
              filter: { zone: "hand", kind: ["Option"], nameOrTrait: traitGate },
              from: ["hand"],
              payCost: true,
              reduceCostBy: 4,
              allowMultiColor: true,
              reduceCostByScaling: perSuspended,
              optional: true,
            },
          ],
        ],
      },
    ];
    for (const index of [2, 3]) {
      expect(compiled.effects[index]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "EX13-043/play-or-use-trait-card",
        actions: playOrUse,
      });
    }
    // ONE printed [Once Per Turn] governs both timings, so both windows share one ledger key.
    expect(compiled.effects[2]!.sharedUseKey).toBe(compiled.effects[3]!.sharedUseKey);

    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          optional: true,
          affectsAll: true,
          sourceFilter: { controller: "mine", kind: ["Digimon"], suspended: true },
          target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], suspended: true } },
          cost: {
            kind: "unsuspend",
            target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], suspended: true } },
          },
        },
      ],
    });

    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Leopardmon: Leopard Mode"], cost: 1, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.assemblyRequirement).toEqual([
      {
        reduceCost: 5,
        materials: [
          { count: 1, level: 5, colors: ["Green"], traits: ["Mammal", "Beast", "Beastkin"] },
          { count: 1, level: 4, colors: ["Green"], traits: ["Mammal", "Beast", "Beastkin"] },
          { count: 1, level: 3, colors: ["Green"], traits: ["Mammal", "Beast", "Beastkin"] },
        ],
      },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual(compiled.assemblyRequirement);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] You may suspend 1 Digimon. Then, you may return 1 of your
  // opponent's lowest DP Digimon to the bottom of the deck.
  // ---------------------------------------------------------------------------

  it("suspends a chosen Digimon on play, then bounces the opponent's LOWEST DP body to the deck bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 3000, as: "weakest" },
            { card: "BT1-012", dp: 10_000, as: "biggest" },
          ],
          deck: [{ card: "BT1-014", as: "deckBottomBefore" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // Bias the suspend onto the opponent's big body so the bounce choice stays unambiguous.
    preferred.push(s.perm("biggest").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("leopardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("biggest").isSuspended).toBe(true);
    // 3000 DP is the lowest, so that is the body that left; the 10000 DP one is still standing.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.perm("biggest").topCard.instanceId,
    ]);
    expect(s.state.players[1]!.deck.map(({ cardId: id }) => id)).toEqual(["BT1-014", "BT1-013"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    // Printed play cost 12 off a gauge of 10.
    expect(s.state.memory).toBe(-2);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("suspends EITHER player's Digimon, because the printed sentence names no controller", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_BEASTKIN_LV5, as: "ally" }],
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("leopardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    // The controller's OWN Digimon took the suspension — the combo this card is built around.
    expect(s.perm("ally").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("declines both printed You-mays independently: nothing suspends and nothing bounces", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-013", dp: 3000, as: "weakest" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("leopardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("weakest").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck.map(({ cardId: id }) => id)).toEqual(DECK);
    assertNoLoudGap(s);
  });

  it("runs the same body from the [When Digivolving] window off the printed Green Lv.5 EvoCost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_BEASTKIN_LV5, as: "base" }],
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: [{ card: "BT1-011", as: "evolutionDraw" }, "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", dp: 3000, as: "weakest" }],
          deck: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("weakest").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    // The source survived the transition as the single digivolution card under the new top card.
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([GREEN_BEASTKIN_LV5]);
    expect(s.perm("base").currentDP).toBe(12_000);
    // The opponent's only Digimon was both the suspend pick and the lowest-DP bounce, so the
    // suspension resolved first and the bounce then removed it.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ cardId: id }) => id)).toEqual(["BT1-014", "BT1-013"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [When Digivolving] [When Attacking] [Once Per Turn] You may play or use 1 [Mammal], [Beast],
  // [Beastkin] or [Royal Knight] trait card from your hand with the cost reduced by 4. For each
  // suspended Digimon, further reduce it by 1.
  // ---------------------------------------------------------------------------

  it("plays a [Beastkin] hand card for 4 less while no Digimon is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "leopardmon" }],
          hand: [
            { card: GREEN_BEASTKIN_LV5, as: "grapleomon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("grapleomon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed play cost 7, reduced by the flat 4 with zero suspended Digimon: 5 - 3 = 2.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    assertNoLoudGap(s);
  });

  it("further reduces the play by 1 for EACH suspended Digimon on EITHER board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon", suspended: true },
            { card: GREEN_MAMMAL_LV3, as: "mySuspended", suspended: true },
          ],
          hand: [
            { card: GREEN_BEASTKIN_LV5, as: "grapleomon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "theirSuspended", suspended: true }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("grapleomon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Three suspended Digimon (two mine, one theirs): 7 - 4 - 3 = 0, so memory is untouched.
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    assertNoLoudGap(s);
  });

  it("FAILS-WHEN-REVERTED: a single suspended Digimon is worth exactly 1 more off the play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "leopardmon", suspended: true }],
          hand: [
            { card: GREEN_BEASTKIN_LV5, as: "grapleomon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("grapleomon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // 7 - 4 - 1 = 2: one step cheaper than the zero-suspended case above.
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("discriminates the exact printed traits from a near-match and a plain hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "leopardmon" }],
          hand: [
            // "Holy Beast" merely CONTAINS "Beast": exact trait matching must refuse it.
            { card: NEAR_TRAIT_LV3, as: "nearMiss" },
            { card: NO_TRAIT_LV3, as: "noTrait" },
            { card: GREEN_BEAST_LV4, as: "match" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("match").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Only the [Beast] Drimogemon was eligible: cost 5 - 4 = 1.
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("nearMiss").instanceId,
      s.inst("noTrait").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("does nothing at all when no hand card carries one of the four printed traits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "leopardmon" }],
          hand: [
            { card: NEAR_TRAIT_LV3, as: "nearMiss" },
            { card: NO_TRAIT_LV3, as: "noTrait" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("nearMiss").instanceId,
      s.inst("noTrait").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines the whole clause without paying or playing anything", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "leopardmon" }],
          hand: [{ card: GREEN_BEASTKIN_LV5, as: "grapleomon" }],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("grapleomon").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("USES a [Royal Knight] Option from hand for 4 less when the play branch has no candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon" },
            // A white permanent is what lets a white Option meet its colour requirement.
            { card: WHITE_SOURCE, as: "whiteSource" },
          ],
          hand: [
            { card: ROYAL_KNIGHT_OPTION, as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(
      () => !s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId),
      5000,
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed use cost 6, reduced by the flat 4: 5 - 2 = 3.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("option").instanceId);
  });

  it.each([
    [0, 9],
    [1, 10],
    [2, 10],
  ])("uses an Option during a public attack with %i suspended opponents", async (opponents, memory) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon" },
            { card: WHITE_SOURCE, as: "whiteSource" },
          ],
          hand: [{ card: ROYAL_KNIGHT_OPTION, as: "option" }],
          deck: [{ card: "BT1-009", as: "draw" }, "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: Array.from({ length: opponents }, (_, index) => ({
            card: "BT10-064",
            as: `opponent${index}`,
            suspended: true,
          })),
          deck: ["BT1-009"],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const host = s.perm("leopardmon");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(memory);
    expect(host.isSuspended).toBe(true);
    expect(host.currentDP).toBe(12000);
    expect(s.perm("whiteSource").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("draw").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("leopardmon").instanceId,
      s.inst("whiteSource").instanceId,
      s.inst("option").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(opponents);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each(["decline", "missingWhite"])("keeps the Option and memory during public attack: %s", async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon" },
            ...(mode === "missingWhite" ? [] : [{ card: WHITE_SOURCE, as: "whiteSource" }]),
          ],
          hand: [{ card: ROYAL_KNIGHT_OPTION, as: "option" }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], security: [{ card: "BT1-009", as: "security" }] },
      },
      {
        autoDeclineOptional: mode === "decline",
        autoAcceptOptional: mode === "missingWhite",
        autoSelectCards: true,
        autoChooseOption: true,
      },
    );
    s.state.memory = 10;
    await s.ready();
    const boardIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leopardmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(boardIds);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("publicly chooses the Option face of a two-color Beastkin DUAL card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon" },
            { card: "BT26-025", as: "yellowSource" },
          ],
          hand: [{ card: "BT26-031", as: "dual" }],
          deck: ["BT1-009"],
          security: [{ card: "BT1-009", as: "paidSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT12-112", as: "victim" }],
          deck: ["BT1-009"],
          security: [{ card: "BT1-009", as: "checkedSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leopardmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("victim").currentDP).toBe(4000);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("leopardmon").instanceId,
      s.inst("yellowSource").instanceId,
    ]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("paidSecurity").instanceId, s.inst("dual").instanceId].sort(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("checkedSecurity").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // Supplemental explicit timing seam; public attack boundaries are above.
  it("applies the per-suspended-Digimon reduction to the Option USE branch too", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon", suspended: true },
            { card: WHITE_SOURCE, as: "whiteSource", suspended: true },
          ],
          hand: [
            { card: ROYAL_KNIGHT_OPTION, as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "leopardmon");
    await settle(
      () => !s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId),
      5000,
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
  });

  it("shares ONE [Once Per Turn] across both printed timings and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_BEASTKIN_LV5, as: "base" }],
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: GREEN_BEAST_LV4, as: "first" },
            { card: GREEN_MAMMAL_LV3, as: "second" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    // [When Digivolving] spends the shared use (printed EvoCost 3, then Drimogemon for 5 - 4 = 1).
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("first").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    const afterDigivolve = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(afterDigivolve).toContain(s.inst("second").instanceId);
    expect(afterDigivolve).not.toContain(s.inst("first").instanceId);

    // Same turn, the other printed window: the SHARED use is already spent.
    s.state.memory = 6;
    await attackWindow(s, "base");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(afterDigivolve);

    // Through the real turn loop, the opponent's turn clears the ledger.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 6;
    await attackWindow(s, "base");
    await settle(() => s.state.pendingDecision === undefined);

    // Elecmon, printed cost 3, reduced by 4 and floored at 0.
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("second").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    ).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] [Leopardmon: Leopard Mode]: Cost 1
  // ---------------------------------------------------------------------------

  it("digivolves from [Leopardmon: Leopard Mode] for 1 with the bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LEOPARD_MODE, as: "base" }],
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: [{ card: "BT1-011", as: "evolutionDraw" }, "BT1-012", "BT1-013"],
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([LEOPARD_MODE]);
    expect(s.perm("base").currentDP).toBe(12_000);
    // Cost 1, not the printed Green Lv.5 EvoCost of 3: a Lv.6 source cannot use that route anyway.
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    assertNoLoudGap(s);
  });

  it("refuses the plain [Leopardmon] printing: the name route is exact, not a substring", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_LEOPARDMON, as: "base" }],
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("leopardmon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }).ok,
      ).toBe(false);
    }
    // No printed EvoCost covers a Lv.6 source either, so nothing moved and nothing was charged.
    expect(s.perm("base").topCard?.cardId).toBe(PLAIN_LEOPARDMON);
    expect(s.state.memory).toBe(5);
  });

  it("charges the printed 3, not 1, for a Green Lv.5 source the name route does not cover", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_BEASTKIN_LV5, as: "base" }],
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    // `useAlternateCost` is a PREFERENCE: with no matching alternate route the engine silently
    // falls back to the printed EvoCost and still reports success, so the proof is the memory.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // [Assembly -5] Lv.5 × Lv.4 × Lv.3, all Green w/[Mammal]/[Beast]/[Beastkin] trait
  // ---------------------------------------------------------------------------

  it("plays by Assembly -5, stacking the three trash materials leftmost-closest for a cost of 7", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "leopardmon" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [
            { card: GREEN_BEASTKIN_LV5, as: "lv5" },
            { card: GREEN_BEAST_LV4, as: "lv4" },
            { card: GREEN_MAMMAL_LV3, as: "lv3" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("leopardmon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("lv3").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    // §7-3-2-6: the leftmost listed material (the Lv.5) ends up closest to the played card, so it
    // is LAST in `stack`, which holds only the cards beneath the top card.
    expect(played.stack.map(({ cardId: id }) => id)).toEqual([GREEN_MAMMAL_LV3, GREEN_BEAST_LV4, GREEN_BEASTKIN_LV5]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // Printed play cost 12 reduced by the flat Assembly -5: 8 - 7 = 1.
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("rejects an Assembly whose materials do not fill Lv.5 × Lv.4 × Lv.3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "leopardmon" }],
          // Two Lv.3 and one Lv.4 matching material: the Lv.5 slot has nothing to fill it.
          trash: [
            { card: GREEN_MAMMAL_LV3, as: "lv3a" },
            { card: "BT9-045", as: "lv3b" },
            { card: GREEN_BEAST_LV4, as: "lv4" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("leopardmon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("lv3a").instanceId, s.inst("lv3b").instanceId, s.inst("lv4").instanceId],
        },
      } as never).ok,
    ).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.memory).toBe(8);
  });

  it("rejects an Assembly material with a near-match trait, and one of the wrong colour", async () => {
    for (const wrongLv3 of [NEAR_TRAIT_LV3, OFF_COLOUR_MAMMAL_LV3]) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: cardId, as: "leopardmon" }],
            trash: [
              { card: GREEN_BEASTKIN_LV5, as: "lv5" },
              { card: GREEN_BEAST_LV4, as: "lv4" },
              { card: wrongLv3, as: "lv3" },
            ],
            deck: DECK,
          },
          1: { deck: DECK },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("leopardmon").instanceId,
          assembly: {
            materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("lv3").instanceId],
          },
        } as never).ok,
      ).toBe(false);
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.trash).toHaveLength(3);
      expect(s.state.memory).toBe(8);
    }
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] When any of your suspended Digimon would leave the battle area
  // other than by your effects, by unsuspending 1 of your Digimon, they don't leave.
  // ---------------------------------------------------------------------------

  it("saves a suspended ally from the opponent's effect by unsuspending one of your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon", suspended: true },
            { card: GREEN_MAMMAL_LV3, as: "victim", suspended: true },
          ],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([victimId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    // Nothing left, and exactly one of the controller's Digimon paid by unsuspending.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([victimId, s.perm("leopardmon").permanentId]),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.filter(({ isSuspended }) => isSuspended)).toHaveLength(1);
  });

  it("lets the suspended victim pay for itself when it is the only Digimon on the board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "leopardmon", suspended: true }],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("leopardmon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.perm("leopardmon").isSuspended).toBe(false);
  });

  it("does not watch an UNSUSPENDED Digimon, so it leaves and nothing is charged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon", suspended: true },
            { card: GREEN_MAMMAL_LV3, as: "victim" },
          ],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([victimId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([GREEN_MAMMAL_LV3]);
    // The suspended host never paid for a leave the replacement did not watch.
    expect(s.perm("leopardmon").isSuspended).toBe(true);
  });

  it("does NOT prevent a leave caused by the controller's OWN effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon", suspended: true },
            { card: GREEN_MAMMAL_LV3, as: "victim", suspended: true },
          ],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([victimId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    // "other than by your effects": no unsuspend cost was charged.
    expect(s.perm("leopardmon").isSuspended).toBe(true);
  });

  it("prevents only ONE leave per turn and reopens after a real turn passes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "leopardmon", suspended: true },
            { card: GREEN_MAMMAL_LV3, as: "first", suspended: true },
            { card: GREEN_BEAST_LV4, as: "second", suspended: true },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-011"],
        },
        1: {
          hand: [{ card: "BT1-012", as: "spareOpponent" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([firstId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    // Same turn: the budget is spent, so a second suspended Digimon is not protected even though
    // a suspended payer is still available.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([secondId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(secondId);

    // A real opponent turn clears the ledger; re-suspend the host and retry.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    await advance(s.engine).verb.suspend([s.perm("leopardmon").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("leopardmon").permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain(cardId);
  });
});
