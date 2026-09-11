import { digivolutionRequirementsFor, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-064.js";

const cardId = "EX13-064";

// Fixtures, and why each one is here:
//   BT5-042  Knightmon       YELLOW Lv.5 [Warrior], 7000 DP, cost 7, "Knightmon" in its NAME. The
//                            colour-widening witness for "[Digivolve] Lv.5 w/[Knightmon] in text":
//                            neither Purple nor Black, so the printed EvoCosts cannot reach it.
//                            Its only window is [On Play], which a digivolve never opens.
//   ST13-12  Knightmon       BLACK/RED Lv.5, 7000 DP, cost 5, completely INERT — a name match with
//                            zero text noise. The play-branch positive and a grant recipient.
//   BT7-059  DeadlyAxemon    BLACK Lv.4 [Dark Animal], 3000 DP, cost 4. Its NAME carries no
//                            "Knightmon" but both its printed and its inherited line name
//                            [Knightmon] (§4-23-3), so it is the TEXT-ONLY match that separates
//                            `match: "text"` from `match: "name"`.
//   ST13-10  Gladimon        BLACK Lv.4 [Warrior], 4000 DP, cost 4, INERT with no "Knightmon"
//                            anywhere. The pure text-gate negative, the non-matching grant
//                            recipient, and the "other Digimon played" trigger source.
//   BT7-058  SkullKnightmon  BLACK Lv.4, cost 4, [Knightmon] in its name — the LEVEL-gate negative
//                            for the "Lv.5 w/[Knightmon] in text" route.
//   BT10-064 Gogmamon        INERT BLACK Lv.5, 8000 DP — satisfies the printed Black Lv.5 EvoCost
//                            and fails the text gate, so it is the route's cost control.
//   BT19-072 LordKnightmon   PURPLE/BLACK Lv.6, cost 11, [Knightmon] in its name — the play/use
//                            COST-ceiling negative: it clears the text gate and fails "8 or lower".
//   BT18-099 Fist of Athena  PURPLE/BLACK Option, use cost 3, [Knightmon] in its text. The
//                            use-branch positive; it shares this host's colours, so §4-22-3 is
//                            satisfied with or without its own colour waiver.
//   BT22-090 Rie Kishibe     BLACK Tamer, cost 3, [CS] trait — the EXACT name the second
//                            [Digivolve] header calls for, a Tamer play-branch target, and the
//                            Tamer-played trigger source.
//   BT10-092 Nene Amano      BLACK Tamer, cost 3 — the wrong-name Tamer negative for that route.
//   BT1-014  Kokatorimon     INERT RED Lv.4, 4000 DP — the opponent's body: the ＜Collision＞
//                            forced blocker and the ＜Piercing＞ battle victim.
//   BT1-010..BT1-013         inert red main-deck Digimon — neutral deck, security and hand bulk.
const TEXT_LV5_YELLOW = "BT5-042";
const INERT_TEXT_LV5 = "ST13-12";
const TEXT_ONLY_LV4 = "BT7-059";
const NO_TEXT_LV4 = "ST13-10";
const TEXT_LV4 = "BT7-058";
const INERT_LV5_BLACK = "BT10-064";
const TOO_EXPENSIVE = "BT19-072";
const KNIGHTMON_OPTION = "BT18-099";
const RIE_KISHIBE = "BT22-090";
const OTHER_TAMER = "BT10-092";
const THEIR_BODY = "BT1-014";
const SPARE = "BT1-010";
const DECK = ["BT1-011", "BT1-012", "BT1-013"];
const SECURITY_3 = ["BT1-013", "BT1-012", "BT1-011"];
const SECURITY_4 = ["BT1-013", "BT1-012", "BT1-011", "BT1-013"];

type Setup = ReturnType<typeof setupEngine>;

/** The combat controller's decision flags; none of them surface through `state.pendingDecision`. */
function combatOf(s: Setup): { hasOpenAllianceDecision: boolean; hasOpenBlockWindow: boolean } {
  return (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean; hasOpenBlockWindow: boolean } }).combat;
}

/**
 * Every attacker in this file carries the host's granted ＜Alliance＞, so a real attack parks on an
 * alliance decision that `state.pendingDecision` does not show. Decline it (no `allyPermanentId`)
 * unless a test wants the ally suspension itself.
 */
async function declineAlliance(s: Setup): Promise<void> {
  const combat = combatOf(s);
  await settle(() => combat.hasOpenAllianceDecision || !observe(s.engine).isAttacking());
  const declined = combat.hasOpenAllianceDecision
    ? s.engine.applyIntent(0, { type: "respondAlliance" })
    : { ok: true as const };
  expect(declined).toEqual({ ok: true });
}

describe("EX13-064 LordKnightmon", () => {
  it("matches the catalog identity and printed text", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "LordKnightmon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12_000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
    });
    // No inherited and no security effect are printed.
    expect((getCardDefinition(cardId)?.inheritedEffectText ?? "").trim()).toBe("");
    expect((getCardDefinition(cardId)?.securityEffectText ?? "").trim()).toBe("");

    const effectText = getCardDefinition(cardId)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] Lv.5 w/[Knightmon] in text: Cost 3");
    expect(effectText).toContain("[Digivolve] While you have 3 or fewer security cards, [Rie Kishibe]: Cost 5");
    expect(effectText).toContain(
      "[When Digivolving] You may play or use 1 play or use cost 8 or lower [Knightmon] text card from your hand or trash without paying the cost.",
    );
    expect(effectText).toContain("[Your Turn] All of your [Knightmon] text Digimon gain ＜Alliance＞");
    expect(effectText).toContain("and ＜Piercing＞");
    expect(effectText).toContain(
      "[Your Turn] [Once Per Turn] When any of your other Digimon or Tamers are played, 1 of your [Knightmon] text Digimon may gain ＜Rush＞ and ＜Collision＞ for the turn and attack.",
    );
  });

  it("compiles every printed clause and nothing else", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["WhenDigivolving", "YourTurn", "YourTurn"]);
    // Nothing on this card is inherited: the catalog prints no inherited text.
    for (const effect of compiled.effects) expect(effect.isInherited).toBeUndefined();

    const textGate = [{ tokens: ["Knightmon"], match: "text" }];
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: { count: 1, filter: { kind: ["Digimon", "Tamer"], playCostLte: 8, nameOrTrait: textGate } },
                from: ["hand", "trash"],
                payCost: false,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: { kind: ["Option"], playCostLte: 8, nameOrTrait: textGate },
                from: ["hand", "trash"],
                payCost: false,
                allowMultiColor: true,
                optional: true,
              },
            ],
          ],
        },
      ],
    });
    // One printed window, no printed [Once Per Turn] on the play-or-use line.
    expect(compiled.effects[0]!.frequency).toBeUndefined();

    const grantTarget = { count: "all", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: textGate } };
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "GainKeyword", target: grantTarget, keyword: { keyword: "Alliance" }, duration: "permanent" },
        { kind: "GainKeyword", target: grantTarget, keyword: { keyword: "Piercing" }, duration: "permanent" },
      ],
    });
    expect(compiled.effects[1]!.frequency).toBeUndefined();

    expect(compiled.effects[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          // "any of your OTHER Digimon or Tamers".
          sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"], excludeSelf: true },
          actions: [
            {
              kind: "SelectBind",
              target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: textGate } },
              optional: true,
              abortOnDecline: true,
            },
            { kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn" },
            { kind: "GainKeyword", keyword: { keyword: "Collision" }, duration: "forTheTurn" },
            { kind: "Attack" },
          ],
        },
      ],
    });
    // The printed attack is unqualified: neither `attackPlayer` nor `attackPlayerOnly` narrows it.
    const attack = (compiled.effects[2]!.actions[0] as { actions: unknown[] }).actions[3]!;
    expect(attack).not.toHaveProperty("attackPlayer");
    expect(attack).not.toHaveProperty("attackPlayerOnly");
    // All three grant/attack steps read back the single printed choice.
    const bindAs = (compiled.effects[2]!.actions[0] as { actions: { target: { bindAs?: string } }[] }).actions[0]!
      .target.bindAs;
    for (const index of [1, 2, 3]) {
      expect(
        (compiled.effects[2]!.actions[0] as { actions: { target: { fromSelectionRef?: string } }[] }).actions[index]!
          .target.fromSelectionRef,
      ).toBe(bindAs);
    }

    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Knightmon"], cost: 3, isAlternate: true },
      {
        namesExact: ["Rie Kishibe"],
        baseIsTamer: true,
        cost: 5,
        isAlternate: true,
        whileCondition: {
          kind: "zoneCount",
          seat: "mine",
          zone: "security",
          op: "lte",
          value: 3,
          raw: "while you have 3 or fewer security cards",
        },
      },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.5 w/[Knightmon] in text: Cost 3
  // ---------------------------------------------------------------------------

  /** A digivolve board whose hand/trash hold nothing the [When Digivolving] clause can reach. */
  function routeBoard(base: string, extras: { security?: string[] } = {}) {
    return {
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [
          { card: cardId, as: "lord" },
          { card: SPARE, as: "spare" },
        ],
        deck: [{ card: "BT1-011", as: "evolutionDraw" }, "BT1-012", "BT1-013"],
        ...(extras.security === undefined ? {} : { security: extras.security }),
      },
      1: { deck: DECK },
    };
  }

  it("digivolves for 3 from a YELLOW Lv.5 with [Knightmon] in its text, widening colour AND cutting the cost", async () => {
    const s = setupEngine(routeBoard(TEXT_LV5_YELLOW), {
      autoDeclineOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lord").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    // Cost 3, not the printed 4 — and Yellow is reachable by no printed EvoCost at all.
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([TEXT_LV5_YELLOW]);
    expect(s.perm("base").currentDP).toBe(12_000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    assertNoLoudGap(s);
  });

  it("charges the printed 4 from a Black Lv.5 with no [Knightmon] in its text", async () => {
    const s = setupEngine(routeBoard(INERT_LV5_BLACK), {
      autoDeclineOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 5;
    await s.ready();

    // `useAlternateCost` is a PREFERENCE, not a gate: with no matching alternate route the engine
    // falls back to the printed Black Lv.5 EvoCost, so the proof is the memory actually charged.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lord").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([INERT_LV5_BLACK]);
  });

  it.each([
    ["a Black Lv.4 that does carry [Knightmon] in its name", TEXT_LV4],
    ["a Yellow Lv.5 with no [Knightmon] anywhere", "BT1-012"],
  ])("refuses %s under either cost preference", async (_label, base) => {
    for (const useAlternateCost of [true, false]) {
      const s = setupEngine(routeBoard(base), { autoDeclineOptional: true, autoSelectCards: true });
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("lord").instanceId,
          useAlternateCost,
        }),
      ).toMatchObject({ ok: false });
      expect(s.state.memory).toBe(5);
      expect(s.perm("base").topCard.cardId).toBe(base);
    }
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] While you have 3 or fewer security cards, [Rie Kishibe]: Cost 5
  // ---------------------------------------------------------------------------

  it("digivolves onto the [Rie Kishibe] TAMER for 5 while you have 3 security cards", async () => {
    const s = setupEngine(routeBoard(RIE_KISHIBE, { security: SECURITY_3 }), {
      autoDeclineOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lord").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    // Cost 5 exactly, the Tamer is now an ordinary digivolution card (KB Q6705), and the Tamer
    // route still draws the digivolution bonus card (KB Q6704).
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([RIE_KISHIBE]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    assertNoLoudGap(s);
  });

  it("refuses the [Rie Kishibe] route with 4 security cards — the printed while-condition is live", async () => {
    const s = setupEngine(routeBoard(RIE_KISHIBE, { security: SECURITY_4 }), {
      autoDeclineOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 5;
    await s.ready();

    // There is no fallback: a Tamer base satisfies neither printed Lv.5 EvoCost.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lord").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.cardId).toBe(RIE_KISHIBE);
  });

  it("refuses a DIFFERENT Black Tamer at 3 security — the bracketed name is an exact identity", async () => {
    const s = setupEngine(routeBoard(OTHER_TAMER, { security: SECURITY_3 }), {
      autoDeclineOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lord").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // [When Digivolving] You may play or use 1 play or use cost 8 or lower [Knightmon] text card
  // from your hand or trash without paying the cost.
  // ---------------------------------------------------------------------------

  /** Digivolve onto the Yellow [Knightmon] for 3, which opens the printed window. */
  function whenDigivolvingBoard(seat0: { hand?: { card: string; as: string }[]; trash?: string[] }, seat1 = {}) {
    return {
      0: {
        battleArea: [{ card: TEXT_LV5_YELLOW, as: "base" }],
        hand: [{ card: cardId, as: "lord" }, ...(seat0.hand ?? []), { card: SPARE, as: "spare" }],
        deck: DECK,
        ...(seat0.trash === undefined ? {} : { trash: seat0.trash }),
      },
      1: { deck: DECK, ...seat1 },
    };
  }

  async function digivolveIntoLord(s: Setup): Promise<void> {
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lord").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
  }

  it("plays a cost-5 [Knightmon]-text Digimon from HAND for free when digivolving", async () => {
    const s = setupEngine(whenDigivolvingBoard({ hand: [{ card: INERT_TEXT_LV5, as: "knightmon" }] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await digivolveIntoLord(s);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("knightmon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Only the digivolve cost of 3 moved the gauge: the printed cost 5 was never paid.
    expect(s.state.memory).toBe(2);
    // The digivolve's own bonus draw also landed in hand, so the proof is that the played card
    // LEFT it while the spare stayed.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("knightmon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("plays the same card out of the TRASH, the second printed source zone", async () => {
    const s = setupEngine(whenDigivolvingBoard({ trash: [INERT_TEXT_LV5] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await digivolveIntoLord(s);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId, INERT_TEXT_LV5]);
  });

  it("discriminates the text gate AND the cost ceiling: only the cheap [Knightmon]-text card is eligible", async () => {
    const s = setupEngine(
      whenDigivolvingBoard({
        hand: [
          // Same cost 4 as a legal target, but no "Knightmon" anywhere in its printed information.
          { card: NO_TEXT_LV4, as: "noText" },
          // [Knightmon] in its name, printed cost 11 — over the printed ceiling of 8.
          { card: TOO_EXPENSIVE, as: "tooExpensive" },
          // "Knightmon" only in its printed TEXT, cost 4 — the one legal target (§4-23-3).
          { card: TEXT_ONLY_LV4, as: "match" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await digivolveIntoLord(s);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("match").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    const handAfter = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handAfter).not.toContain(s.inst("match").instanceId);
    // Both rejected cards — and only they, plus the spare and the digivolve's bonus draw — stayed.
    expect(handAfter).toContain(s.inst("noText").instanceId);
    expect(handAfter).toContain(s.inst("tooExpensive").instanceId);
    expect(handAfter).toContain(s.inst("spare").instanceId);
    expect(handAfter).toHaveLength(4);
    expect(s.state.memory).toBe(2);
  });

  it("reaches a TAMER too, because the printed noun is 'card' and not 'Digimon card'", async () => {
    const s = setupEngine(whenDigivolvingBoard({ hand: [{ card: RIE_KISHIBE, as: "tamer" }] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await digivolveIntoLord(s);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("tamer").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed Tamer cost 3, paid by nobody; only the digivolve's own 3 left the gauge.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("USES a [Knightmon]-text Option from the trash when the play branch has no candidate", async () => {
    const s = setupEngine(
      whenDigivolvingBoard({ trash: [KNIGHTMON_OPTION] }, { battleArea: [{ card: THEIR_BODY, as: "theirs" }] }),
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await digivolveIntoLord(s);
    await settle(() => s.state.players[0]!.trash.every(({ cardId: id }) => id !== KNIGHTMON_OPTION), 5000);
    await settle(() => s.state.pendingDecision === undefined);

    // Printed use cost 3 and the gauge only moved by the digivolve's 3: "without paying the cost".
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).not.toContain(KNIGHTMON_OPTION);
  });

  it("declines the printed You-may and plays nothing", async () => {
    const s = setupEngine(whenDigivolvingBoard({ hand: [{ card: INERT_TEXT_LV5, as: "knightmon" }] }), {
      autoDeclineOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await digivolveIntoLord(s);
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("knightmon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does nothing when neither zone holds a card clearing both printed qualifiers", async () => {
    const s = setupEngine(
      whenDigivolvingBoard({ hand: [{ card: NO_TEXT_LV4, as: "noText" }], trash: [TOO_EXPENSIVE] }),
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await digivolveIntoLord(s);
    await settle(() => s.perm("base").topCard?.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noText").instanceId);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([TOO_EXPENSIVE]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [Your Turn] All of your [Knightmon] text Digimon gain ＜Alliance＞ and ＜Piercing＞
  // ---------------------------------------------------------------------------

  it("grants ＜Alliance＞ and ＜Piercing＞ to every matching Digimon, but only on your own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "lord" },
          { card: INERT_TEXT_LV5, as: "nameMatch" },
          { card: TEXT_ONLY_LV4, as: "textMatch" },
          { card: NO_TEXT_LV4, as: "noMatch" },
        ],
        hand: [{ card: SPARE, as: "spare" }],
        deck: DECK,
        security: ["BT1-013"],
      },
      1: { deck: DECK, security: ["BT1-013", "BT1-011"] },
    });
    const granted = ["lord", "nameMatch", "textMatch"] as const;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    for (const alias of granted) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Alliance")).toBe(true);
      // ＜Piercing＞ lands in the battle modifier ledger, not the keyword ledger that
      // `hasKeyword` reads, so `hasPierce` is the only honest probe for it.
      expect(observe(s.engine).hasPierce(s.perm(alias))).toBe(true);
    }
    // Gladimon shares the host's colour and the [Warrior] family and still misses: the only thing
    // separating it from the others is the absence of "Knightmon" in its printed text.
    expect(observe(s.engine).hasKeyword(s.perm("noMatch"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("noMatch"))).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // [Your Turn] only: the opponent's turn strips the grant from every one of them.
    for (const alias of [...granted, "noMatch"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Alliance")).toBe(false);
      expect(observe(s.engine).hasPierce(s.perm(alias))).toBe(false);
    }

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    for (const alias of granted) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Alliance")).toBe(true);
    }

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("covers a matching Digimon that arrives mid-turn, with no includeLaterEntrants flag", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "lord" }], hand: [{ card: SPARE, as: "spare" }], deck: DECK },
      1: { deck: DECK },
    });
    await s.ready();

    s.putOnBoard(0, { card: TEXT_ONLY_LV4, as: "latecomer" });
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("latecomer"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("latecomer"))).toBe(true);
  });

  it("the granted ＜Alliance＞ really suspends an ally, adds its DP and checks 1 extra security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TEXT_ONLY_LV4, as: "attacker", dp: 3000 },
            { card: NO_TEXT_LV4, as: "ally", dp: 4000 },
          ],
          hand: [{ card: SPARE, as: "spare" }],
          deck: DECK,
          security: ["BT1-013"],
        },
        1: { deck: DECK, security: ["BT1-011", "BT1-011", "BT1-011"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    // The host is not on the board as a permanent here — it is the Digimon UNDER nothing; instead
    // put it in play so the grant exists, then attack with the text-only match.
    s.putOnBoard(0, { card: cardId, as: "lord" });
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(true);

    const combat = combatOf(s);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    // ＜Alliance＞ (§16-24): the ally is suspended and the attack checked 2 security cards.
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("the granted ＜Piercing＞ checks security after the attacker wins a battle, and a non-matching Digimon does not", async () => {
    function board(attacker: string) {
      return {
        0: {
          battleArea: [
            { card: cardId, as: "lord" },
            { card: attacker, as: "attacker", dp: 20_000 },
          ],
          hand: [{ card: SPARE, as: "spare" }],
          deck: DECK,
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: THEIR_BODY, as: "victim", suspended: true }],
          deck: DECK,
          security: ["BT1-011", "BT1-011"],
        },
      };
    }

    const hit = setupEngine(board(INERT_TEXT_LV5), { autoSelectCards: true, autoDeclineOptional: true });
    await hit.ready();
    expect(observe(hit.engine).hasPierce(hit.perm("attacker"))).toBe(true);
    expect(
      hit.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hit.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hit.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await declineAlliance(hit);
    await settle(() => !observe(hit.engine).isAttacking());

    expect(hit.state.players[1]!.battleArea).toHaveLength(0);
    // ＜Piercing＞: the won battle also checked 1 security card.
    expect(hit.state.players[1]!.security).toHaveLength(1);

    const miss = setupEngine(board(NO_TEXT_LV4), { autoSelectCards: true, autoDeclineOptional: true });
    await miss.ready();
    expect(observe(miss.engine).hasPierce(miss.perm("attacker"))).toBe(false);
    expect(
      miss.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: miss.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: miss.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(miss.engine).isAttacking());

    expect(miss.state.players[1]!.battleArea).toHaveLength(0);
    expect(miss.state.players[1]!.security).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // [Your Turn] [Once Per Turn] When any of your other Digimon or Tamers are played, 1 of your
  // [Knightmon] text Digimon may gain ＜Rush＞ and ＜Collision＞ for the turn and attack.
  // ---------------------------------------------------------------------------

  function rushBoard(hand: { card: string; as: string }[], seat1: Record<string, unknown> = {}) {
    return {
      0: {
        battleArea: [{ card: cardId, as: "lord" }],
        hand: [...hand, { card: SPARE, as: "spare" }],
        deck: DECK,
        security: ["BT1-013"],
      },
      1: { deck: DECK, security: ["BT1-011", "BT1-011", "BT1-011"], ...seat1 },
    };
  }

  it("grants ＜Rush＞ and ＜Collision＞ to a chosen [Knightmon]-text Digimon and attacks when another Digimon is played", async () => {
    const s = setupEngine(rushBoard([{ card: NO_TEXT_LV4, as: "other" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // The host is the only [Knightmon]-text Digimon, so it is the chosen attacker.
    expect(observe(s.engine).hasKeyword(s.perm("lord"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("lord"), "Collision")).toBe(true);
    expect(s.perm("lord").isSuspended).toBe(true);
    // The attack landed on the player: 1 security card checked.
    expect(s.state.players[1]!.security).toHaveLength(2);
    // Only the played Gladimon's printed cost 4 left the gauge.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("the granted ＜Collision＞ forces the opponent to block with a Digimon that has no ＜Blocker＞", async () => {
    const s = setupEngine(
      rushBoard([{ card: NO_TEXT_LV4, as: "other" }], { battleArea: [{ card: THEIR_BODY, as: "theirs", dp: 4000 }] }),
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const combat = combatOf(s);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => combat.hasOpenBlockWindow);

    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened && "mustBlock" in opened ? opened.mustBlock : undefined).toBe(true);
    expect(opened && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : []).toContain(
      s.perm("theirs").permanentId,
    );
    // §16-30: with an eligible (Collision-granted) blocker on the board, declining is illegal.
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toMatchObject({ ok: false });
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("theirs").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());

    // The block happened, so no security was checked; 12000 DP beat 4000 DP, and the granted
    // ＜Piercing＞ then checked exactly 1 security card off the won battle.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("fires on a played TAMER as well as a played Digimon", async () => {
    const s = setupEngine(rushBoard([{ card: RIE_KISHIBE, as: "tamer" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("lord"), "Rush")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(3);
  });

  it("declines the printed may: no keyword is granted and no attack happens", async () => {
    const s = setupEngine(rushBoard([{ card: NO_TEXT_LV4, as: "other" }]), {
      autoDeclineOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("other").instanceId),
    );
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("lord"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("lord"), "Collision")).toBe(false);
    expect(s.perm("lord").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(2);
  });

  it("offers only [Knightmon]-text Digimon, and can be steered onto the TEXT-only match", async () => {
    // A live array the harness reads when it answers the capped SelectBind choice.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "lord" },
            { card: TEXT_ONLY_LV4, as: "textMatch", dp: 20_000 },
            { card: NO_TEXT_LV4, as: "noMatch", dp: 20_000 },
          ],
          hand: [
            { card: "BT1-012", as: "other" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
          security: ["BT1-013"],
        },
        1: { deck: DECK, security: ["BT1-011", "BT1-011", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: prefer },
    );
    s.state.memory = 6;
    await s.ready();
    // Steer the single printed choice onto the TEXT-only match, which a `match: "name"` reading of
    // the printed sentence would never offer at all (§4-23-3).
    prefer.push(s.perm("textMatch").topCard.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("textMatch"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("textMatch"), "Collision")).toBe(true);
    expect(s.perm("textMatch").isSuspended).toBe(true);
    // The non-matching Gladimon was never a candidate: keyword-free and still unsuspended, even
    // though it shares the colour, level family and DP of the body that was chosen.
    expect(observe(s.engine).hasKeyword(s.perm("noMatch"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("noMatch"), "Collision")).toBe(false);
    expect(s.perm("noMatch").isSuspended).toBe(false);
    // Exactly one attack happened, so the host did not also attack.
    expect(s.perm("lord").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("fires once per turn and resets on your next own turn, through the real turn loop", async () => {
    const s = setupEngine(
      rushBoard([
        { card: NO_TEXT_LV4, as: "first" },
        { card: "BT1-012", as: "second" },
        { card: "BT1-013", as: "third" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("lord").isSuspended).toBe(true);

    // Same turn, a second play: the printed [Once Per Turn] is spent, so nothing attacks again.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    );
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(2);

    // A full opponent turn through the production loop clears the per-turn ledger.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    // `runTurn` leaves the loop parked past Main; a hand-laid next turn re-opens it (EX13-014).
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    await advance(s.engine).verb.unsuspend([s.perm("lord").permanentId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("lord").isSuspended).toBe(true);
  });

  it("stays silent on the opponent's turn, when the OPPONENT plays a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "lord" }],
          hand: [{ card: SPARE, as: "spare" }],
          deck: DECK,
          security: ["BT1-013", "BT1-011"],
        },
        1: {
          hand: [
            { card: NO_TEXT_LV4, as: "theirs" },
            { card: SPARE, as: "theirSpare" },
          ],
          deck: DECK,
          security: ["BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -6;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirs").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("theirs").instanceId),
    );
    await settle();

    // [Your Turn] plus `controller: "mine"`: neither gate is met, so nothing was granted and
    // nothing attacked.
    expect(observe(s.engine).hasKeyword(s.perm("lord"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("lord"), "Collision")).toBe(false);
    expect(s.perm("lord").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
