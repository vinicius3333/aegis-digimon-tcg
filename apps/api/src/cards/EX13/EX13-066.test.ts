import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX13-066.js";
import "./EX13-066.js";

// Fixtures (all read from the committed catalog, no module of their own is imported so they
// behave as vanilla cards — a per-card test loads only its own card module):
//   BT10-085 Sistermon Ciel           White Lv.4 Digimon, play cost 4, 5000 DP
//                                     -> the exact-name digivolution source, the ＜Decode＞
//                                        payload, and the Option side's play target.
//   BT7-083  Sistermon Ciel (Awakened) White Lv.4 Digimon, play cost 6, 6000 DP
//                                     -> the EXACT-NAME near miss: it carries "Sistermon Ciel"
//                                        inside its name but is not named [Sistermon Ciel].
//   BT7-082  Sistermon Blanc (Awakened) White Lv.3 Digimon, play cost 5
//                                     -> the PLAY-COST near miss for the Option side (5 > 4).
//   BT20-084 Sistermon Ciel (Awakened) White Lv.4 Digimon, play cost 5
//                                     -> the white permanent the Option side's colour
//                                        requirement needs, and a counted "your Digimon". It is
//                                        deliberately not a legal Arts Digivolve base (see below).
//   EX13-009 Huckmon                  Red/White Lv.3, named Huckmon -> the text route's source.
//   EX13-011 BaoHuckmon               Red/White Lv.4 carrying [Huckmon] -> the text route's
//                                        LEVEL near miss.
//   BT1-009 Monodramon (Lv.3), BT1-013 Muchomon (Lv.3, 5000 DP), BT1-014 Kokatorimon (Lv.4,
//   play cost 3), BT2-027 Zudomon (Lv.5), BT1-080 Titamon (Lv.6, play cost 10): inert
//   main-deck Digimon with no printed effects, used as neutral fixtures.
const CARD_ID = "EX13-066";

const board = (s: ReturnType<typeof setupEngine>, seat: 0 | 1): string[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard.cardId);

const trash = (s: ReturnType<typeof setupEngine>, seat: 0 | 1): string[] =>
  s.state.players[seat]!.trash.map((card) => card.cardId).sort();

describe("EX13-066 compiled fidelity", () => {
  it("matches the catalog and encodes both DUAL faces with no residual behaviour", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Sistermon Noir (Awakened)",
      colors: ["White", "Black"],
      kinds: ["Digimon", "Option"],
      level: 4,
      playCost: 5,
      dp: 6000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Puppet"],
      evoCosts: [],
      isDualCard: true,
      dualEffect: "Mickey Bullet (Awakened)",
      optionColorRequirements: ["White"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Sistermon Noir", "Sistermon Ciel"], cost: 1, isAlternate: true },
      { level: 3, texts: ["Huckmon"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects).toHaveLength(5);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Decode" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Rule",
      actions: [
        { kind: "GrantStatic", grant: "name", tokens: ["Sistermon Ciel (Awakened)"] },
        { kind: "GrantStatic", grant: "trait", tokens: ["Data"] },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
        },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
              target: {
                filter: {
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [{ tokens: ["Sistermon Noir", "Sistermon Ciel"], match: "nameExact" }],
                },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[4]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { playCostLte: 4, nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }] },
            count: 1,
          },
        },
        {
          kind: "DeDigivolve",
          amount: 1,
          scaling: { per: 1, unit: "cards", filter: { controller: "mine", kind: ["Digimon"] } },
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
    // The Option half carries no kind gate: comprehensive §7-1 only ever PLAYS a card, and
    // `playableCandidates` drops Option-only candidates from a kind-less pool.
    const optionPlay = compiled.effects[4]!.actions[0]! as unknown as {
      target: { filter: Record<string, unknown> };
    };
    expect(optionPlay.target.filter).not.toHaveProperty("kind");
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
  });
});

describe("EX13-066 [Rule] Also has Name / Trait", () => {
  it("carries the granted name and the [Data] attribute alongside its printed identity", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "noir" }] } });
    await s.ready();

    const noir = s.perm("noir");
    // The continuous ledger stores granted names case-folded.
    expect(observe(s.engine).grantedNames(noir)).toContain("sistermon ciel (awakened)");
    expect(
      observe(s.engine)
        .effectiveNames(noir)
        .map((name) => name.toLowerCase()),
    ).toEqual(expect.arrayContaining(["sistermon noir (awakened)", "sistermon ciel (awakened)"]));
    // The granted attribute sits next to the printed one, and no unrelated attribute leaks in.
    expect(observe(s.engine).hasEffectiveTrait(noir, "Data")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(noir, "Virus")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(noir, "Vaccine")).toBe(false);
    expect(observe(s.engine).hasEffectiveTrait(noir, "Puppet")).toBe(true);
    expect(observe(s.engine).hasKeyword(noir, "Decode")).toBe(true);
  });

  it("grants neither the name nor the attribute to an unrelated board neighbour", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "noir" },
          // BT1-009 Monodramon is [Vaccine], so a leaked [Data] grant is visible.
          { card: "BT1-009", as: "neighbour" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).grantedNames(s.perm("neighbour"))).toEqual([]);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("neighbour"), "Data")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("neighbour"), "Decode")).toBe(false);
  });
});

describe("EX13-066 digivolution routes", () => {
  it("digivolves from an exact [Sistermon Ciel] for 1 memory, keeping the source under it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-085", as: "base" }],
        hand: [
          { card: CARD_ID, as: "noir" },
          { card: "BT1-013", as: "spare" },
        ],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("noir").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT10-085"]);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("noir").instanceId);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a Lv.3 carrying [Huckmon] in its text for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX13-009", as: "base" }],
        hand: [
          { card: CARD_ID, as: "noir" },
          { card: "BT1-013", as: "spare" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("noir").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX13-009"]);
  });

  it("refuses every illegal source: the (Awakened) near-name, a plain Lv.3, and a Lv.4 [Huckmon]", async () => {
    // `useAlternateCost` is only a PREFERENCE in both directions, so each negative is driven
    // with BOTH settings: the card prints no EvoCost at all, so a refused alternate route has
    // nothing to fall back to and the whole digivolve must be rejected.
    for (const [label, baseCardId] of [
      ["exact-name near miss", "BT7-083"],
      ["Lv.3 without [Huckmon]", "BT1-009"],
      ["Lv.4 with [Huckmon]", "EX13-011"],
    ] as const) {
      for (const useAlternateCost of [true, false]) {
        const s = setupEngine({
          0: {
            battleArea: [{ card: baseCardId, as: "base" }],
            hand: [{ card: CARD_ID, as: "noir" }],
          },
        });
        s.state.memory = 10;
        await s.ready();

        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("noir").instanceId,
            useAlternateCost,
          }),
          `${label} / useAlternateCost=${String(useAlternateCost)}`,
        ).toEqual(expect.objectContaining({ ok: false }));
        expect(s.perm("base").topCard.cardId).toBe(baseCardId);
        expect(s.state.memory).toBe(10);
      }
    }
  });
});

describe("EX13-066 [When Digivolving] Delete", () => {
  it("deletes an opposing play cost 4 Digimon and leaves the play cost 5 one alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-085", as: "base" }],
          hand: [
            { card: CARD_ID, as: "noir" },
            { card: "BT1-013", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT10-085", as: "costFour" },
            { card: "BT7-082", as: "costFive" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("noir").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 1);
    await settle();

    // The ceiling discriminates exactly at 4: cost 4 dies, cost 5 survives.
    expect(board(s, 1)).toEqual(["BT7-082"]);
    expect(trash(s, 1)).toEqual(["BT10-085"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is a no-op when the only opposing Digimon sits just above the ceiling at play cost 5", async () => {
    // The boundary is proven with a SOLE candidate per run: on a mixed board the auto-responder
    // could pick the legal target for the wrong reason and a loosened ceiling would go unnoticed.
    for (const [label, cardId, survives] of [
      ["play cost 5", "BT7-082", true],
      ["play cost 10", "BT1-080", true],
      ["play cost 4", "BT10-085", false],
      ["play cost 3", "BT1-014", false],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT10-085", as: "base" }],
            hand: [
              { card: CARD_ID, as: "noir" },
              { card: "BT1-013", as: "spare" },
            ],
          },
          1: { battleArea: [{ card: cardId, as: "subject" }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 1;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("noir").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      await settle();

      // The label rides inside the compared value so a failure names which bound broke.
      expect({ label, battleArea: board(s, 1), trash: trash(s, 1) }).toEqual({
        label,
        battleArea: survives ? [cardId] : [],
        trash: survives ? [] : [cardId],
      });
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });
});

describe("EX13-066 ＜Decode ([Sistermon Noir]/[Sistermon Ciel])＞", () => {
  const decodeBoard = (stack: string[]) => ({
    0: {
      battleArea: [{ card: CARD_ID, as: "noir", under: stack }],
      deck: ["BT1-009"],
      security: ["BT1-009"],
    },
    1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 12_000 }], security: ["BT1-009"] },
  });

  it("plays the exact [Sistermon Ciel] out of its own stack when an opponent effect deletes it", async () => {
    const s = setupEngine(decodeBoard(["BT1-009", "BT10-085"]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const noirId = s.perm("noir").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("noir"), "Decode")).toBe(true);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.deletePermanent([noirId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => board(s, 0).includes("BT10-085"));
    await settle();

    // Sistermon Ciel stands alone in the battle area with an empty stack; the host and the
    // inert Digi-Egg-less filler under it went to the trash. No memory was paid.
    expect(board(s, 0)).toEqual(["BT10-085"]);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(trash(s, 0)).toEqual(["BT1-009", CARD_ID]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays it from the trash zone of choice — the controller may decline and lose the stack", async () => {
    const s = setupEngine(decodeBoard(["BT1-009", "BT10-085"]), {
      autoDeclineOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const noirId = s.perm("noir").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.deletePermanent([noirId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.trash.length === 3);
    await settle();

    expect(board(s, 0)).toEqual([]);
    expect(trash(s, 0)).toEqual(["BT1-009", "BT10-085", CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate when the leave IS a battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "noir", suspended: true, under: ["BT10-085"] }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 12_000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("noir").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle();

    expect(board(s, 0)).toEqual([]);
    expect(trash(s, 0)).toEqual(["BT10-085", CARD_ID]);
  });

  it("reads only its OWN stack, and only an exactly named source", async () => {
    const s = setupEngine(
      {
        0: {
          // Own stack: the (Awakened) exact-name near miss plus inert filler. The genuine
          // [Sistermon Ciel] sits under a NEIGHBOUR, out of ＜Decode＞'s reach (§16-36-1).
          battleArea: [
            { card: CARD_ID, as: "noir", under: ["BT7-083", "BT1-009"] },
            { card: "BT1-013", as: "neighbour", under: ["BT10-085"] },
          ],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 12_000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const noirId = s.perm("noir").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.deletePermanent([noirId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.trash.length === 3);
    await settle();

    expect(board(s, 0)).toEqual(["BT1-013"]);
    expect(s.perm("neighbour").stack.map(({ cardId }) => cardId)).toEqual(["BT10-085"]);
    expect(trash(s, 0)).toEqual(["BT1-009", "BT7-083", CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("EX13-066 Option side — Mickey Bullet (Awakened)", () => {
  // The victim's stack is built so each successive ＜De-Digivolve 1＞ is observable: the promoted
  // card is Lv.5 after one peel, Lv.4 after two and Lv.3 after three (`peelStackTops` floors at
  // level 3, so a stack of Lv.3 sources would make every amount look identical). Every card in
  // it also has a printed play cost of 5 or more, so this card's own [When Digivolving] Delete
  // can never reach the victim if CR §4-19 Arts Digivolve fires afterwards (see below).
  const victim = () => ({
    card: "BT1-080",
    as: "victim",
    under: ["BT7-082", "BT7-083", "BT2-027"],
  });

  // BT20-084 Sistermon Ciel (Awakened) is the white permanent the Option's colour requirement
  // needs (§4-21-2: only a Digimon or Tamer can satisfy it). It is deliberately NOT a legal
  // Arts Digivolve base for this card — it is Lv.4 (so the "Lv.3 w/[Huckmon] in text" route
  // fails) and it is named "Sistermon Ciel (Awakened)", not [Sistermon Ciel] (so the exact-name
  // route fails). Every Lv.3 [Sistermon] printed to date carries [Huckmon] in its text, so a
  // Lv.3 anchor would silently become an Arts Digivolve host and move this card onto the board.
  const whiteAnchor = () => ({ card: "BT20-084", as: "white" });

  it("plays a cost 4 [Sistermon] from hand for free, then De-Digivolves once per own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [whiteAnchor()],
          hand: [
            { card: CARD_ID, as: "mickey" },
            { card: "BT10-085", as: "payload" },
            { card: "BT7-082", as: "tooExpensive" },
            { card: "BT1-013", as: "notSistermon" },
          ],
        },
        1: { battleArea: [victim()] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("mickey").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").topCard.cardId === "BT7-083");
    await settle();

    // Only the cost-4 [Sistermon] left the hand, and it cost no extra memory: the 5 paid is the
    // Option's own use cost.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-013", "BT7-082"]);
    // Exactly 2 peels ran — one per own Digimon, counting the card this effect just played.
    expect(s.perm("victim").topCard.cardId).toBe("BT7-083");
    expect(s.perm("victim").stack.map(({ cardId }) => cardId)).toEqual(["BT7-082"]);
    expect(trash(s, 1)).toEqual(["BT1-080", "BT2-027"]);
    // CR §4-19 Arts Digivolve is a DUAL-card RULE, not a clause on this card: after the Option
    // side resolves, one of the controller's permanents may digivolve into it for free instead
    // of the Option going to the trash. The Sistermon Ciel this effect just played answers this
    // card's own exact-name route, so it accepts — and the resulting [When Digivolving] Delete
    // finds no opposing Digimon at play cost 4 or less (the victim's top is the cost-6 BT7-083).
    expect(board(s, 0).sort()).toEqual(["BT20-084", CARD_ID]);
    expect(s.perm("white").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still De-Digivolves when the optional play is declined, counting one fewer Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [whiteAnchor()],
          hand: [
            { card: CARD_ID, as: "mickey" },
            { card: "BT10-085", as: "payload" },
          ],
        },
        1: { battleArea: [victim()] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("mickey").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));
    await settle();

    // The "Then, ..." sentence is mandatory and independent of the declined "You may play ...".
    expect(board(s, 0)).toEqual(["BT20-084"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT10-085"]);
    // One own Digimon => exactly one peel.
    expect(s.perm("victim").topCard.cardId).toBe("BT2-027");
    expect(s.perm("victim").stack.map(({ cardId }) => cardId)).toEqual(["BT7-082", "BT7-083"]);
    expect(trash(s, 1)).toEqual(["BT1-080"]);
    // No Arts Digivolve base exists, so the Option goes to the trash as normal.
    expect(trash(s, 0)).toEqual([CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("peels once per own Digimon — three own Digimon peel three times", async () => {
    const s = setupEngine(
      {
        0: {
          // Two inert Lv.3 fillers with no printed text: neither carries [Huckmon], so neither
          // becomes an Arts Digivolve base either.
          battleArea: [whiteAnchor(), { card: "BT1-013", as: "fillerA" }, { card: "BT1-009", as: "fillerB" }],
          hand: [{ card: CARD_ID, as: "mickey" }],
        },
        1: { battleArea: [victim()] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("mickey").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));
    await settle();

    expect(s.perm("victim").topCard.cardId).toBe("BT7-082");
    expect(s.perm("victim").stack).toHaveLength(0);
    expect(trash(s, 1)).toEqual(["BT1-080", "BT2-027", "BT7-083"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reaches a [Sistermon] in the trash, and refuses a cost 5 or cost 6 one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [whiteAnchor()],
          hand: [
            { card: CARD_ID, as: "mickey" },
            { card: "BT7-082", as: "tooExpensive" },
            { card: "BT1-013", as: "notSistermon" },
          ],
          trash: [
            { card: "BT10-085", as: "payload" },
            { card: "BT7-083", as: "alsoTooExpensive" },
          ],
        },
        1: { battleArea: [victim()] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("mickey").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").topCard.cardId === "BT7-083");
    await settle();

    // Only the cost-4 [Sistermon] in the trash was reachable: the cost-5 [Sistermon] in hand,
    // the cost-6 [Sistermon] in the trash and the non-[Sistermon] Lv.3 all stayed put.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-013", "BT7-082"]);
    expect(trash(s, 0)).toEqual(["BT7-083"]);
    expect(s.perm("victim").stack.map(({ cardId }) => cardId)).toEqual(["BT7-082"]);
  });

  it("leaves the play clause empty when no [Sistermon] is cheap enough, and still peels", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [whiteAnchor()],
          hand: [
            { card: CARD_ID, as: "mickey" },
            { card: "BT7-082", as: "tooExpensive" },
            { card: "BT1-013", as: "notSistermon" },
          ],
        },
        1: { battleArea: [victim()] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("mickey").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));
    await settle();

    expect(board(s, 0)).toEqual(["BT20-084"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-013", "BT7-082"]);
    expect(s.perm("victim").stack.map(({ cardId }) => cardId)).toEqual(["BT7-082", "BT7-083"]);
  });

  it("cannot be used as an Option without a white card in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "notWhite" }],
          hand: [
            { card: CARD_ID, as: "mickey" },
            { card: "BT10-085", as: "payload" },
          ],
        },
        1: { battleArea: [victim()] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    // "without paying the cost" on this card's own Option clause waives a cost, never the
    // Option's own colour requirement — and nothing on this card waives
    // `optionColorRequirements: ["White"]`.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("mickey").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(board(s, 0)).toEqual(["BT1-013"]);
    expect(s.perm("victim").topCard.cardId).toBe("BT1-080");
    expect(s.state.memory).toBe(5);
  });

  it("plays as a Digimon for its full play cost when the Digimon side is declared", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [whiteAnchor()],
          hand: [
            { card: CARD_ID, as: "noir" },
            { card: "BT1-013", as: "spare" },
          ],
        },
        1: { battleArea: [victim()] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("noir").instanceId })).toEqual({ ok: true });
    await settle(() => board(s, 0).includes(CARD_ID));
    await settle();

    // The Digimon side has no [On Play] clause and no Option [Main] ran, so nothing peels and
    // the card stands as its own permanent with an empty stack.
    expect(s.state.memory).toBe(0);
    expect(board(s, 0).sort()).toEqual(["BT20-084", CARD_ID]);
    expect(s.perm("victim").topCard.cardId).toBe("BT1-080");
    expect(s.perm("victim").stack).toHaveLength(3);
    expect(trash(s, 1)).toEqual([]);
  });
});
