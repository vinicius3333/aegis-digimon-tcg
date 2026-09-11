import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-058.js";

const cardId = "EX13-058";

// Fixtures, and why each one is here:
//   BT7-059  DeadlyAxemon    BLACK Lv.4 [Dark Animal], 3000 DP, cost 4. Its NAME carries no
//                            "Knightmon" but both its printed effect and its inherited line name
//                            [Knightmon], so it is the TEXT-ONLY match: the discriminator that
//                            separates `match: "text"` from `match: "name"`. Used as the
//                            alternate-route digivolution source and as a grant recipient. Its own
//                            inherited "[Your Turn] While this Digimon has [Knightmon] ... +2000
//                            DP" is the witness that the source card survives the digivolve.
//   BT7-058  SkullKnightmon  BLACK Lv.4 [Undead], 3000 DP, cost 4, [Knightmon] in its name and in
//                            its inherited line. Its only printed window is [When Attacking], so
//                            playing it opens no decision — the clean play-branch positive.
//   ST13-10  Gladimon        BLACK Lv.4 [Warrior], 4000 DP, cost 4, and completely INERT with no
//                            "Knightmon" anywhere. Same cost as the positive, so it is the pure
//                            text-gate negative; also the printed-EvoCost control and the
//                            non-matching grant recipient.
//   BT18-062 Gladimon        BLACK Lv.4, cost 5, [Knightmon] in its text — the COST-ceiling
//                            negative: it satisfies the text gate and fails "4 or less".
//   BT22-090 Rie Kishibe     BLACK Tamer, cost 3, [Knightmon] in its text — the printed noun is
//                            "card", not "Digimon card", so the play branch must reach a Tamer.
//                            Neither of its printed windows opens during a play.
//   BT18-099 Fist of Athena  PURPLE/BLACK Option, use cost 3, [Knightmon] in its text, and it
//                            waives its own colour requirements "while you have a Digimon with
//                            [Knightmon] in its text" — which this host is. The use-branch proof.
//   ST13-12  Knightmon       BLACK/RED Lv.5, 7000 DP, cost 5, INERT — a NAME match with zero text
//                            noise, for the grant set and the once-per-turn second play.
//   BT18-058 Kotemon         BLACK Lv.3 with [Knightmon] in its text — the LEVEL-gate negative for
//                            the "Lv.4 w/[Knightmon] in text" route.
//   BT1-014  Kokatorimon     inert RED Lv.4, 4000 DP — the wrong-colour, no-text digivolution
//                            negative, and a Lv.4 source card inside the opponent's stack so a
//                            single ＜De-Digivolve 1＞ is observable (`peelStackTops` stops once a
//                            level-3 card is on top).
//   BT10-064 Gogmamon        inert BLACK Lv.5, 8000 DP — the opponent's de-digivolve victim.
//   BT1-010..BT1-013         inert red main-deck Digimon — neutral deck, security and hand bulk.
const TEXT_ONLY_LV4 = "BT7-059";
const NAMED_LV4 = "BT7-058";
const INERT_LV4 = "ST13-10";
const TOO_EXPENSIVE = "BT18-062";
const KNIGHTMON_TAMER = "BT22-090";
const KNIGHTMON_OPTION = "BT18-099";
const INERT_NAMED_LV5 = "ST13-12";
const KNIGHTMON_LV3 = "BT18-058";
const OFF_COLOUR_LV4 = "BT1-014";
const VICTIM_LV5 = "BT10-064";
const SPARE = "BT1-010";
const DECK = ["BT1-011", "BT1-012", "BT1-013"];

/** Fire the [When Attacking] window on a permanent without running a whole combat (EX13-043). */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-058 Knightmon", () => {
  it("matches the catalog identity and printed text", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Knightmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Warrior"],
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
    });
    expect((getCardDefinition(cardId)?.securityEffectText ?? "").trim()).toBe("");

    const effectText = getCardDefinition(cardId)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] Lv.4 w/[Knightmon] in text: Cost 3");
    expect(effectText).toContain(
      "[When Attacking] [On Deletion] You may play or use 1 card with [Knightmon] in its text and a play or use cost of 4 or less from your hand without paying the cost.",
    );
    expect(effectText).toContain(
      "[Opponent's Turn] All of your Digimon with [Knightmon] in their texts gain ＜Reboot＞ and ＜Blocker＞",
    );
    expect((getCardDefinition(cardId)?.inheritedEffectText ?? "").trim()).toBe(
      "[All Turns] [Once Per Turn] When any of your Digimon with [Knightmon] in their texts are played, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
    );
  });

  it("compiles every printed clause and nothing else", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "WhenAttacking",
      "OnDeletion",
      "OpponentsTurn",
      "AllTurns",
    ]);

    const textGate = [{ tokens: ["Knightmon"], match: "text" }];
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
                filter: { zone: "hand", kind: ["Digimon", "Tamer"], playCostLte: 4, nameOrTrait: textGate },
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
          [
            {
              kind: "UseOptionWithoutCost",
              filter: { zone: "hand", kind: ["Option"], playCostLte: 4, nameOrTrait: textGate },
              from: ["hand"],
              payCost: false,
              allowMultiColor: true,
              optional: true,
            },
          ],
        ],
      },
    ];
    for (const index of [0, 1]) {
      expect(compiled.effects[index]).toMatchObject({ actions: playOrUse });
      // No [Once Per Turn] is printed on this line, so neither window carries a per-turn budget.
      expect(compiled.effects[index]!.frequency).toBeUndefined();
      expect(compiled.effects[index]!.sharedUseKey).toBeUndefined();
    }

    expect(compiled.effects[2]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: textGate } },
          keyword: { keyword: "Reboot" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: textGate } },
          keyword: { keyword: "Blocker" },
          duration: "permanent",
        },
      ],
    });
    expect(compiled.effects[2]!.isInherited).toBeUndefined();

    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: textGate },
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
            },
          ],
        },
      ],
    });
    // The printed De-Digivolve carries no "may".
    expect(compiled.effects[3]!.actions[0]).not.toHaveProperty("optional");

    // The text route costs the same 3 as the printed Black Lv.4 EvoCost and the catalog has no
    // non-Black Lv.4 carrying [Knightmon] in its text, so this entry's only observable effect has
    // no fixture. It is asserted structurally here and called out in the audit note rather than
    // claimed as behaviourally proven.
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Knightmon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
  });

  // ---------------------------------------------------------------------------
  // [When Attacking] [On Deletion] You may play or use 1 card with [Knightmon] in its text and a
  // play or use cost of 4 or less from your hand without paying the cost.
  // ---------------------------------------------------------------------------

  it("plays a cost-4 [Knightmon]-text Digimon from hand for free off [When Attacking]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          hand: [
            { card: NAMED_LV4, as: "skull" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "knightmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("skull").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // "without paying the cost": printed cost 4 and the gauge never moves.
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("discriminates the text gate AND the cost ceiling: only the cheap [Knightmon]-text card is eligible", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          hand: [
            // Same cost 4 as the match, but no "Knightmon" anywhere in its printed information.
            { card: INERT_LV4, as: "noText" },
            // [Knightmon] in its text, but printed cost 5 — over the printed ceiling.
            { card: TOO_EXPENSIVE, as: "tooExpensive" },
            { card: NAMED_LV4, as: "match" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "knightmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("match").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("noText").instanceId,
      s.inst("tooExpensive").instanceId,
    ]);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("matches a card whose [Knightmon] reference lives only in its TEXT, not its name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          // DeadlyAxemon: no "Knightmon" in the name, [Knightmon] in the effect and inherited text.
          hand: [
            { card: TEXT_ONLY_LV4, as: "axemon" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "knightmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("axemon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("axemon").instanceId);
  });

  it("reaches a TAMER too, because the printed noun is 'card' and not 'Digimon card'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          hand: [
            { card: KNIGHTMON_TAMER, as: "tamer" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "knightmon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("tamer").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed Tamer cost 3, paid by nobody.
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("USES a [Knightmon]-text Option from hand when the play branch has no candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          hand: [
            { card: KNIGHTMON_OPTION, as: "option" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
        },
        // The Option's own [Main] effect needs an opposing Digimon to aim at.
        1: { battleArea: [{ card: INERT_LV4, as: "theirs" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "knightmon");
    await settle(
      () => !s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId),
      5000,
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed use cost 3, and the gauge never moves: "without paying the cost".
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("does nothing when no hand card clears both printed qualifiers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          hand: [
            { card: INERT_LV4, as: "noText" },
            { card: TOO_EXPENSIVE, as: "tooExpensive" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "knightmon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("noText").instanceId,
      s.inst("tooExpensive").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines the printed You-may and plays nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          hand: [{ card: NAMED_LV4, as: "skull" }],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "knightmon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("skull").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("runs the same body from the [On Deletion] window after the host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "knightmon" }],
          hand: [
            { card: NAMED_LV4, as: "skull" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const hostInstance = s.inst("knightmon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("knightmon").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("skull").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(hostInstance);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("skull").instanceId,
    ]);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [Opponent's Turn] All of your Digimon with [Knightmon] in their texts gain ＜Reboot＞ and
  // ＜Blocker＞
  // ---------------------------------------------------------------------------

  it("grants ＜Reboot＞ and ＜Blocker＞ to every matching Digimon, but only on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "knightmon" },
          { card: INERT_NAMED_LV5, as: "nameMatch" },
          { card: TEXT_ONLY_LV4, as: "textMatch" },
          { card: INERT_LV4, as: "noMatch" },
        ],
        hand: [{ card: SPARE, as: "spare" }],
        deck: DECK,
        security: ["BT1-013"],
      },
      1: { deck: DECK, security: ["BT1-013", "BT1-011"] },
    });
    const granted = ["knightmon", "nameMatch", "textMatch"] as const;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // The host's own turn: nothing is granted, including to the host itself.
    for (const alias of [...granted, "noMatch"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(false);
    }

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    for (const alias of granted) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
    }
    // Gladimon shares the host's colour, level and [Warrior] trait and still misses: the only
    // thing separating it from the others is the absence of "Knightmon" in its printed text.
    expect(observe(s.engine).hasKeyword(s.perm("noMatch"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("noMatch"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    for (const alias of granted) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(false);
    }

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("lets a granted ＜Blocker＞ actually block, through a real opponent-turn attack", async () => {
    const s = setupEngine(
      {
        0: {
          // The text-only match is the blocker, so the block proves the filter as well as the grant.
          battleArea: [
            { card: cardId, as: "knightmon" },
            { card: TEXT_ONLY_LV4, as: "textMatch", dp: 20_000 },
          ],
          hand: [{ card: SPARE, as: "spare" }],
          deck: DECK,
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: INERT_LV4, as: "attacker", dp: 3000 }], deck: DECK, security: ["BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean; hasOpenCounterWindow: boolean } })
      .combat;
    expect(observe(s.engine).hasKeyword(s.perm("textMatch"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenBlockWindow);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("textMatch").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The block happened: the 3000 DP attacker lost to the 20000 DP blocker and no security was
    // checked.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  // "All of your Digimon" is a live set, not a snapshot: the resident clause is re-derived on
  // every continuous pass, so a Digimon that arrives mid-turn is covered without the
  // `includeLaterEntrants` flag a once-resolved timed grant would need.
  it("covers a matching Digimon that arrives DURING the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "knightmon" }], hand: [{ card: SPARE, as: "spare" }], deck: DECK },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    s.putOnBoard(0, { card: INERT_NAMED_LV5, as: "latecomer" });
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("latecomer"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("latecomer"), "Blocker")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // [Inherited] [All Turns] [Once Per Turn] When any of your Digimon with [Knightmon] in their
  // texts are played, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
  // ---------------------------------------------------------------------------

  /** The inherited clause live: this card buried under a neutral host. */
  function inheritedBoard(hand: { card: string; as: string }[]) {
    return {
      0: {
        battleArea: [{ card: OFF_COLOUR_LV4, as: "host", under: [{ card: cardId, as: "buried" }] }],
        hand: [...hand, { card: SPARE, as: "spare" }],
        deck: DECK,
        security: ["BT1-013"],
      },
      1: {
        battleArea: [{ card: VICTIM_LV5, as: "victim", under: [{ card: "BT1-013", as: "victimLv3" }, OFF_COLOUR_LV4] }],
        hand: [{ card: SPARE, as: "theirSpare" }],
        deck: DECK,
        security: ["BT1-011"],
      },
    };
  }

  it("de-digivolves an opposing Digimon when one of your [Knightmon]-text Digimon is played", async () => {
    const s = setupEngine(inheritedBoard([{ card: NAMED_LV4, as: "skull" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 8;
    await s.ready();
    expect(s.perm("host").stack.map(({ cardId: id }) => id)).toEqual([cardId]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").topCard.cardId === OFF_COLOUR_LV4);
    await settle();

    // The Lv.5 top card was trashed and its Lv.4 source card is the new top card.
    expect(s.perm("victim").topCard.cardId).toBe(OFF_COLOUR_LV4);
    expect(s.perm("victim").stack.map(({ cardId: id }) => id)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([VICTIM_LV5]);
    // Printed play cost 4, paid normally: this clause grants no discount.
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("ignores a played Digimon with no [Knightmon] anywhere in its text", async () => {
    const s = setupEngine(inheritedBoard([{ card: INERT_LV4, as: "gladimon" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("gladimon").instanceId),
    );
    await settle();

    expect(s.perm("victim").topCard.cardId).toBe(VICTIM_LV5);
    expect(s.perm("victim").stack.map(({ cardId: id }) => id)).toEqual(["BT1-013", OFF_COLOUR_LV4]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });

  it("fires once per turn and resets on your next own turn, through the real turn loop", async () => {
    const s = setupEngine(
      inheritedBoard([
        { card: NAMED_LV4, as: "first" },
        { card: INERT_NAMED_LV5, as: "second" },
        { card: TEXT_ONLY_LV4, as: "third" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").topCard.cardId === OFF_COLOUR_LV4);
    await settle();
    expect(s.perm("victim").stack.map(({ cardId: id }) => id)).toEqual(["BT1-013"]);

    // Same turn, a second [Knightmon]-text Digimon: the printed [Once Per Turn] is spent, so the
    // Lv.4 top card stays put instead of peeling down to the Lv.3 source.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    );
    await settle();
    expect(s.perm("victim").topCard.cardId).toBe(OFF_COLOUR_LV4);
    expect(s.perm("victim").stack.map(({ cardId: id }) => id)).toEqual(["BT1-013"]);

    // A full opponent turn through the production loop clears the per-turn ledger.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    // `runTurn` leaves the loop parked past Main; a hand-laid next turn re-opens it (EX13-014).
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").topCard.cardId === "BT1-013");
    await settle();

    expect(s.perm("victim").topCard.cardId).toBe("BT1-013");
    expect(s.perm("victim").stack).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.4 w/[Knightmon] in text: Cost 3
  // ---------------------------------------------------------------------------

  it("digivolves for 3 from a Lv.4 whose [Knightmon] reference is TEXT-only, keeping the source's inherited line", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TEXT_ONLY_LV4, as: "base" }],
          hand: [
            { card: cardId, as: "knightmon" },
            { card: SPARE, as: "spare" },
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
        instanceId: s.inst("knightmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([TEXT_ONLY_LV4]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    // DeadlyAxemon's inherited "[Your Turn] While this Digimon has [Knightmon] in its name, it gets
    // +2000 DP" survived the transition and now sees the new top card's name.
    expect(s.perm("base").currentDP).toBe(9000);
    assertNoLoudGap(s);
  });

  it("charges the same printed 3 for a Black Lv.4 with no [Knightmon] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT_LV4, as: "base" }],
          hand: [
            { card: cardId, as: "knightmon" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    // `useAlternateCost` is a PREFERENCE, not a gate: with no matching alternate route the engine
    // silently falls back to the printed Black Lv.4 EvoCost, so the proof is the memory charged.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("knightmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    // The printed EvoCost and the text route both cost 3, so this card's alternate route widens
    // the source pool (any colour) without ever being cheaper.
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").currentDP).toBe(7000);
  });

  it.each([
    ["a non-Black Lv.4 with no [Knightmon] in its text", OFF_COLOUR_LV4],
    ["a Black Lv.3 that does carry [Knightmon] in its text", KNIGHTMON_LV3],
  ])("refuses %s under either cost preference", async (_label, base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [
            { card: cardId, as: "knightmon" },
            { card: SPARE, as: "spare" },
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
          instanceId: s.inst("knightmon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }).ok,
      ).toBe(false);
    }

    expect(s.perm("base").topCard?.cardId).toBe(base);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("knightmon").instanceId);
  });
});
