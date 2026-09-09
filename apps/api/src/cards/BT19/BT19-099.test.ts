import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-099 The Wicked God Descends! — Purple Option, use cost 4, [Wicked God] trait.
//   [Main]       You may play 1 Digimon with the [Composite] trait card from your trash with the
//     play cost reduced by 4. Then, place this card in the battle area.
//   [All Turns]  When any of your Digimon with [Millenniummon] in its name would leave the battle
//     area, ＜Delay＞ ・ You may play 1 [Wicked God] trait Digimon card with a play cost 1 higher
//     than that Digimon from your hand or trash without paying the cost.
//   [Security]   Place this card in the battle area.
//
// KB (`node tools/kb/query.mjs card BT19-099`):
//   Q3175 — several of your Digimon with different play costs and [Millenniummon] in their names
//     would leave at the same time: you choose 1 of them and play a [Wicked God] Digimon whose
//     play cost is 1 higher THAN THAT Digimon.
//
// Fixture vocabulary:
//   BT3-076 Candlemon    — inert mono-PURPLE Lv.3. Seat 0's colour source for the Option's
//                          printed Purple requirement.
//   BT1-038 Monzaemon    — inert mono-BLUE Lv.5. The off-colour board for the refusal case.
//   BT6-012 Deltamon     — [Composite] Lv.4, play cost 5, NO printed effect text. The [Main]
//                          revival target: 5 - 4 = 1 memory.
//   BT1-013 Muchomon     — inert Lv.3 with NO [Composite] trait: the [Main] trait near miss.
//   BT18-019 Millenniummon (play cost 14) / BT2-083 Millenniummon (play cost 15) — the two
//                          "[Millenniummon] in its name" bodies. Their DIFFERENT play costs are
//                          what makes the ＜Delay＞ cost reference observable (Q3175).
//   BT19-075 MoonMillenniummon (Wicked God, play cost 15) — the legal answer to BT18-019 leaving,
//                          and the near miss when BT2-083 leaves.
//   BT19-101 ZeedMillenniummon (Wicked God, play cost 16) — the mirror of that pair.
//   BT1-051 Reppamon seeded at dp 20000 and suspended — the opponent wall a Millenniummon can
//                          legally attack into and lose to, which is a REAL "would leave".
//   BT1-009..BT1-013     — inert main-deck Digimon used as deck and security padding. No Digi-Egg
//                          is seeded in any deck or security stack.

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

describe("BT19-099 The Wicked God Descends! — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-099")).toMatchObject({
      cardId: "BT19-099",
      nameEn: "The Wicked God Descends!",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      types: ["Wicked God"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT19-099")!;
    // The catalog stores a NON-BREAKING space (U+00A0) after "[Composite] trait"; normalise it so
    // the assertion reads as the printed sentence. Reported as a catalog quirk, not edited.
    const effectText = printed.effectText!.replaceAll(" ", " ");
    expect(effectText).toContain(
      "[Main] You may play 1 Digimon with the [Composite] trait card from your trash with the play cost reduced by 4. " +
        "Then, place this card in the battle area.",
    );
    expect(effectText).toContain(
      "[All Turns] When any of your Digimon with [Millenniummon] in its name would leave the battle area, ＜Delay＞",
    );
    expect(effectText).toContain(
      "You may play 1 [Wicked God] trait Digimon card with a play cost 1 higher than that Digimon " +
        "from your hand or trash without paying the cost.",
    );
    expect(printed.securityEffectText).toBe("[Security] Place this card in the battle area.");
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-099");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "PlayFromZone",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                // "with the [Composite] trait" is the EXACT trait form, not `traitContains`.
                nameOrTrait: [{ tokens: ["Composite"], match: "trait" }],
              },
              count: 1,
            },
            from: ["trash"],
            costReduction: 4,
            // "You may play" — declining must still leave the "Then, place this card" tail.
            optional: true,
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "AllTurns",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDigimonWouldLeave",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              // "with [Millenniummon] IN ITS NAME" is the substring form, so `match: "name"`
              // (not `nameExact`) is right here: MoonMillenniummon and ZeedMillenniummon count.
              nameOrTrait: [{ tokens: ["Millenniummon"], match: "name" }],
            },
            // Q3175: the controller picks ONE leaving Millenniummon as the cost reference.
            pickOne: true,
            actions: [
              {
                kind: "PlayFromZone",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Wicked God"], match: "trait" }],
                    playCost: { op: "eq", relativeToLeavingDigimon: 1 },
                  },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
                optional: true,
              },
            ],
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] },
    ]);
  });
});

describe("BT19-099 The Wicked God Descends! — use cost and the colour requirement", () => {
  function colourFixture(ownBoard: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-099", as: "option" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          trash: [{ card: "BT6-012", as: "composite" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("refuses the play with no Purple permanent on the controller's board", async () => {
    // BT19-099 prints no colour waiver, so the mono-blue board fails `printedColorRequirementMet`.
    const s = colourFixture(["BT1-038"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-099");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("composite").instanceId);
  });

  it("accepts the play off a single Purple permanent and charges the printed 4 plus the reduced revival", async () => {
    const s = colourFixture(["BT3-076", "BT1-038"]);
    await s.ready();
    const compositeId = s.inst("composite").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === compositeId));

    // Option 4 + Deltamon (printed 5, reduced by 4) 1 = 5.
    expect(s.state.memory).toBe(5);
  });
});

describe("BT19-099 The Wicked God Descends! — [Main]", () => {
  function mainFixture(trash: (string | { card: string; as: string })[], opts: { decline?: boolean }): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-099", as: "option" }, "BT1-009"],
          battleArea: [{ card: "BT3-076", as: "purple" }],
          trash,
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      opts.decline === true
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("revives the [Composite] Digimon at cost - 4 and then places itself, leaving the trait near miss behind", async () => {
    const s = mainFixture(
      [
        { card: "BT6-012", as: "composite" },
        { card: "BT1-013", as: "traitMiss" },
      ],
      {},
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const compositeId = s.inst("composite").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    // "You may play 1 Digimon with the [Composite] trait card from your trash ..."
    const revived = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === compositeId);
    expect(revived).toBeDefined();
    expect(revived!.topCard!.cardId).toBe("BT6-012");
    // "Then, place this card in the battle area" — the Option is a permanent, not trash.
    const placed = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(boardCardIds(s, 0)).toEqual(["BT19-099", "BT3-076", "BT6-012"]);

    // The non-[Composite] Lv.3 was never a candidate.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("traitMiss").instanceId]);
    // 10 - 4 (Option) - 1 (5 reduced by 4) = 5.
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("places itself for the printed 4 when the trash holds only the trait near miss", async () => {
    const s = mainFixture([{ card: "BT1-013", as: "traitMiss" }], {});
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    expect(boardCardIds(s, 0)).toEqual(["BT19-099", "BT3-076"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("traitMiss").instanceId]);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("declined: the revival is skipped but the Option still places itself", async () => {
    const s = mainFixture([{ card: "BT6-012", as: "composite" }], { decline: true });
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    expect(boardCardIds(s, 0)).toEqual(["BT19-099", "BT3-076"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("composite").instanceId]);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });
});

describe("BT19-099 The Wicked God Descends! — ＜Delay＞ on a Millenniummon leaving (Q3175)", () => {
  /**
   * BT19-099 sits on the board as the Option permanent its own [Main]/[Security] clause places,
   * which is where the [All Turns] watcher lives. Seat 0 then plays BT15-098 Mist Barrier
   * ("[Main] By deleting 1 of your Digimon, ..."): a REAL printed card effect whose cost deletes
   * the Millenniummon, so "would leave the battle area" is reached through the public `playCard`
   * intent rather than an injected `fireSubTrigger`. With no [Myotismon] in the trash, Mist
   * Barrier's own payload is a no-op and only its cost is observable.
   */
  function delayFixture(
    millenniummon: string,
    hand: (string | { card: string; as: string })[],
    prefer: string[],
    opts: { decline?: boolean } = {},
  ): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-099", as: "option" },
            { card: "BT3-076", as: "purple" },
            { card: millenniummon, as: "mill" },
          ],
          hand: [{ card: "BT15-098", as: "mist" }, ...hand],
          trash: [],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-051", as: "bystander" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      opts.decline === true
        ? { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: prefer }
        : { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 10;
    return s;
  }

  /** Play Mist Barrier, paying its "by deleting 1 of your Digimon" cost with the Millenniummon. */
  const playMistBarrier = (s: EngineSetup): unknown =>
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mist").instanceId });

  // ＜Delay＞ body: `relativeToLeavingDigimon` reads the leaving Digimon's play cost. Leave and
  // deletion events resolve AFTER the permanent has left the battle area, so `play.ts` reads the
  // removal snapshot (`deletedPermanentSnapshots` / `deletedTopCardId`) when the live board no
  // longer holds it — the same data `subTrigger.ts` `deletionSourceFilterGate` gates on. These
  // three tests were retained reds until that fallback was added; see
  // docs/audits/BT19-reaudit/LEAVING-DIGIMON-PLAY-MECHANISM.md.
  //
  // The battle-deletion route (attack into a suspended 20000 DP wall, combat/controller.ts:1584)
  // travels the same seam and is covered by the engine regression test.
  it("plays the play-cost-15 [Wicked God] free when the play-cost-14 Millenniummon leaves", async () => {
    const prefer: string[] = [];
    const s = delayFixture(
      "BT18-019",
      [
        { card: "BT19-075", as: "moon" }, // Wicked God, play cost 15 = 14 + 1 -> the legal answer
        { card: "BT19-101", as: "zeed" }, // Wicked God, play cost 16 -> the COST near miss
        { card: "BT6-012", as: "composite" }, // play cost 5, [Composite] -> the TRAIT near miss
        "BT1-009",
      ],
      prefer,
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;
    const moonId = s.inst("moon").instanceId;

    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === moonId));

    // The Millenniummon really left, and the play-cost-15 Wicked God took its place.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT18-019");
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toContain(moonId);
    // "without paying the cost": the only memory that moved is Mist Barrier's printed 4.
    expect(s.state.memory).toBe(6);
    // The cost and trait near misses stayed in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("zeed").instanceId, s.inst("composite").instanceId]),
    );
    // ＜Delay＞ is paid by trashing the Option: BT19-099 leaves the battle area for the trash.
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).not.toContain("BT19-099");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-099");
    assertNoLoudGap(s);
  });

  it("plays the play-cost-16 [Wicked God] instead when the play-cost-15 Millenniummon leaves (Q3175)", async () => {
    // Same board, a different leaving Digimon. BT2-083 Millenniummon costs 15, so ZeedMillenniummon
    // (16) becomes the only legal answer and MoonMillenniummon (15) becomes the near miss. The
    // pair is what pins the filter to the Digimon that actually left rather than to a fixed cost —
    // exactly the "1 higher than THAT Digimon" reading Q3175 gives for the simultaneous case.
    const prefer: string[] = [];
    const s = delayFixture(
      "BT2-083",
      [{ card: "BT19-075", as: "moon" }, { card: "BT19-101", as: "zeed" }, "BT1-009"],
      prefer,
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;
    const zeedId = s.inst("zeed").instanceId;

    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === zeedId));

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toContain(zeedId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("moon").instanceId);
    assertNoLoudGap(s);
  });

  it("also reaches into the trash for the [Wicked God] card", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-099", as: "option" },
            { card: "BT3-076", as: "purple" },
            { card: "BT18-019", as: "mill" },
          ],
          hand: [{ card: "BT15-098", as: "mist" }, "BT1-009"],
          trash: [{ card: "BT19-075", as: "moon" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-051", as: "bystander" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;
    const moonId = s.inst("moon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mist").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === moonId));

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toContain(moonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(moonId);
    assertNoLoudGap(s);
  });

  it("near miss: a Digimon without [Millenniummon] in its name leaving does nothing", async () => {
    // BT6-012 Deltamon is [Composite] and shares the archetype, but its name carries no
    // "Millenniummon", so the watcher must sleep and both Wicked God cards stay in hand.
    const prefer: string[] = [];
    const s = delayFixture(
      "BT6-012",
      [{ card: "BT19-075", as: "moon" }, { card: "BT19-101", as: "zeed" }, "BT1-009"],
      prefer,
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;

    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("moon").instanceId, s.inst("zeed").instanceId]),
    );
    // Only Mist Barrier joined the board; BT19-099 was never asked to trash itself.
    expect(boardCardIds(s, 0)).toEqual(["BT15-098", "BT19-099", "BT3-076"]);
    assertNoLoudGap(s);
  });

  it("declined: the ＜Delay＞ is not paid, the Option stays on the board and nothing is played", async () => {
    const prefer: string[] = [];
    const s = delayFixture("BT18-019", [{ card: "BT19-075", as: "moon" }, "BT1-009"], prefer, { decline: true });
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;

    // `autoDeclineOptional` also declines Mist Barrier's own "by deleting" cost, so drive that
    // cost by hand: answer the first optional yes, the rest no.
    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("moon").instanceId);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("BT19-099");
  });
});

describe("BT19-099 The Wicked God Descends! — [Security]", () => {
  it("places itself in the defender's battle area on a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "attacker" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [{ card: "BT19-099", as: "flip" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const flipId = s.inst("flip").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === flipId));

    const placed = s.state.players[1]!.battleArea.find((perm) => perm.topCard?.instanceId === flipId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(flipId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(flipId);
    expect(s.state.players[1]!.security.length).toBe(2);
    assertNoLoudGap(s);
  });
});
