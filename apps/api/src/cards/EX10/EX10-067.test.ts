import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-067.js";
import "../index.js";

const CARD_ID = "EX10-067";

/**
 * EX10-067 Ryoma Mogami (Purple Tamer, [Hunter], play cost 4).
 *
 * [Start of Your Turn] If you have 2 or less memory, set it to 3.
 * [Your Turn] When any of your Digimon digivolve into a Digimon with <Save> in its text,
 *   by suspending this Tamer and placing 1 Digimon card with <Save> in its text from under
 *   your Tamers as that Digimon's bottom digivolution card, that Digimon gains <Alliance>
 *   for the turn.
 * [Security] Play this card without paying the cost.
 *
 * Every clause below is driven through public intents and the production turn loop:
 * the start-of-turn clause fires from `startTurnLoop`, the watcher from a real `digivolve`
 * intent, and the Security clause from a real attack that checks security.
 *
 * Fixtures:
 *   BT2-067 DemiDevimon  - Purple Lv.3, no text at all: the digivolution base.
 *   BT10-076 Troopmon    - Purple Lv.4 from Purple Lv.3 for 2, carries <Save> in its text,
 *                          and its only clause is an [Opponent's Turn] watcher, so
 *                          digivolving into it on your own turn opens no window.
 *   BT4-080 Bakemon      - Purple Lv.4 from Purple Lv.3 for 2, no text: the non-<Save> control.
 *   BT11-077 Chikurimon  - Purple Lv.3 Digimon card with <Save> in its text: the banked card.
 */
describe("EX10-067 Ryoma Mogami", () => {
  it("records the exact catalog and the complete cost/recipient contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Ryoma Mogami",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["Hunter"],
      // The catalog prints a NON-BREAKING space after each ＜Save＞ token; asserted verbatim so
      // a silent catalog rewrite of the printed text is caught here rather than in the IR.
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[Your Turn] When any of your Digimon digivolve into a Digimon with ＜Save＞ in its text, by suspending this Tamer and placing 1 Digimon card with ＜Save＞ in its text from under your Tamers as that Digimon's bottom digivolution card, that Digimon gains ＜Alliance＞ for the turn.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], keywords: ["Save"] },
          cost: {
            kind: "compound",
            costs: [
              { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              {
                kind: "place",
                target: {
                  filter: { controller: "mine", kind: ["Digimon"], zone: "underTamers", keywords: ["Save"] },
                  count: 1,
                  from: ["underTamers"],
                },
                destination: "digivolutionStack",
                // "as that Digimon's BOTTOM digivolution card": without `position: "bottom"`
                // the placed card lands directly beneath the top card instead.
                position: "bottom",
                // "that Digimon" is the digivolution's subject, not this Tamer.
                host: "triggerSource",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: { sourceRef: "triggerSubject" },
              keyword: { keyword: "Alliance" },
              duration: "forTheTurn",
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("[Start of Your Turn] sets memory to 3 from 2 or less through the real turn loop", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "ryoma" }], hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Start of Your Turn] leaves 3 or more memory alone, and is inert from the trash", async () => {
    const high = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "ryoma" }], hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
    });
    high.state.memory = 4;
    const highLoop = high.engine.startTurnLoop();
    await advance(high.engine).waitForMainPhase(0);
    expect(high.state.memory).toBe(4);
    expect(high.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await highLoop;

    // A Tamer in the trash is not in play: no clause of it may run.
    const trashed = setupEngine({
      0: { trash: [{ card: CARD_ID, as: "ryoma" }], hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
    });
    trashed.state.memory = 0;
    const trashedLoop = trashed.engine.startTurnLoop();
    await advance(trashed.engine).waitForMainPhase(0);
    expect(trashed.state.memory).toBe(0);
    expect(trashed.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await trashedLoop;
  });

  it("suspends itself, banks a saved card at the subject's BOTTOM, and grants that subject Alliance for the turn", async () => {
    // FAILS-WHEN-REVERTED: drop the `suspend` cost and `ryoma` stays unsuspended; drop
    // `position: "bottom"` and the banked card lands above DemiDevimon; drop `host:
    // "triggerSource"` and it lands under the Tamer instead of under the digivolved Digimon;
    // drop the `GainKeyword` and Alliance is absent.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "ryoma",
              under: [
                { card: "BT11-077", as: "savedA" },
                { card: "BT11-077", as: "savedB" },
              ],
            },
            { card: "BT2-067", as: "base" },
          ],
          hand: [{ card: "BT10-076", as: "troopmon" }, "BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // The start-of-turn clause already fired: 0 memory became 3.
    expect(s.state.memory).toBe(3);
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("troopmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("ryoma").isSuspended);
    await settle(() => false, 30);

    const subject = s.perm("base");
    expect(subject.topCard.cardId).toBe("BT10-076");
    // Bottom-most first: the banked <Save> card sits UNDER the Lv.3 the Digimon digivolved from.
    expect(subject.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("savedA").instanceId, baseInstanceId]);
    expect(subject.stack.map(({ cardId }) => cardId)).toEqual(["BT11-077", "BT2-067"]);
    expect(observe(s.engine).hasKeyword(subject, "Alliance")).toBe(true);

    // Exactly one card left the Tamer; the other stays banked.
    expect(s.perm("ryoma").isSuspended).toBe(true);
    expect(s.perm("ryoma").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("savedB").instanceId]);

    // Endpoints: digivolving BT10-076 from a Lv.3 costs 2 memory and draws 1.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    // "for the turn": the grant is gone once the turn has actually ended.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("is optional: declining leaves the Tamer unsuspended, the bank intact and no Alliance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "ryoma", under: [{ card: "BT11-077", as: "saved" }] },
            { card: "BT2-067", as: "base" },
          ],
          hand: [{ card: "BT10-076", as: "troopmon" }, "BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("troopmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("base").topCard.cardId === "BT10-076");
    await settle(() => false, 40);

    expect(s.perm("ryoma").isSuspended).toBe(false);
    expect(s.perm("ryoma").stack.map(({ cardId }) => cardId)).toEqual(["BT11-077"]);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT2-067"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a digivolution into a Digimon without <Save> in its text", async () => {
    // FAILS-WHEN-REVERTED: drop `keywords: ["Save"]` from the sourceFilter and Bakemon
    // triggers the watcher too.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "ryoma", under: [{ card: "BT11-077", as: "saved" }] },
            { card: "BT2-067", as: "base" },
          ],
          hand: [{ card: "BT4-080", as: "bakemon" }, "BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("base").topCard.cardId === "BT4-080");
    await settle(() => false, 40);

    expect(s.perm("ryoma").isSuspended).toBe(false);
    expect(s.perm("ryoma").stack.map(({ cardId }) => cardId)).toEqual(["BT11-077"]);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT2-067"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays nothing when the bank is empty, holds a non-<Save> card, or sits under a Digimon", async () => {
    // FAILS-WHEN-REVERTED: drop `keywords: ["Save"]` from the place cost and the DemiDevimon
    // bank pays; drop `zone: "underTamers"` / `from: ["underTamers"]` and the card banked under
    // a Digimon pays.
    for (const fixture of [
      { label: "no bank at all", ryomaUnder: [] as string[], extra: [] as { card: string; under: string[] }[] },
      { label: "bank holds a card without <Save>", ryomaUnder: ["BT2-067"], extra: [] },
      {
        label: "the <Save> card is under a Digimon, not a Tamer",
        ryomaUnder: [],
        extra: [{ card: "BT1-013", under: ["BT11-077"] }],
      },
    ]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: CARD_ID, as: "ryoma", under: fixture.ryomaUnder },
              { card: "BT2-067", as: "base" },
              ...fixture.extra.map(({ card, under }) => ({ card, under })),
            ],
            hand: [{ card: "BT10-076", as: "troopmon" }, "BT1-009"],
            deck: ["BT1-013", "BT1-014"],
          },
          1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("troopmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => s.perm("base").topCard.cardId === "BT10-076");
      await settle(() => false, 40);

      expect({ label: fixture.label, suspended: s.perm("ryoma").isSuspended }).toEqual({
        label: fixture.label,
        suspended: false,
      });
      expect({ label: fixture.label, stack: s.perm("base").stack.map(({ cardId }) => cardId) }).toEqual({
        label: fixture.label,
        stack: ["BT2-067"],
      });
      expect({
        label: fixture.label,
        alliance: observe(s.engine).hasKeyword(s.perm("base"), "Alliance"),
      }).toEqual({ label: fixture.label, alliance: false });
      expect({ label: fixture.label, banked: s.perm("ryoma").stack.map(({ cardId }) => cardId) }).toEqual({
        label: fixture.label,
        banked: fixture.ryomaUnder,
      });

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("is inert from the hand and the trash: neither copy watches a qualifying digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-088", as: "otherTamer", under: [{ card: "BT11-077", as: "saved" }] },
            { card: "BT2-067", as: "base" },
          ],
          hand: [
            { card: "BT10-076", as: "troopmon" },
            { card: CARD_ID, as: "inHand" },
          ],
          trash: [{ card: CARD_ID, as: "inTrash" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // No Ryoma is in play, so the start-of-turn clause did not run either.
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("troopmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("base").topCard.cardId === "BT10-076");
    await settle(() => false, 40);

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT2-067"]);
    expect(s.perm("otherTamer").stack.map(({ cardId }) => cardId)).toEqual(["BT11-077"]);
    expect(s.perm("otherTamer").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID, "BT1-013"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Your Turn] and 'your Digimon': the opponent's own digivolution on their turn does nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "ryoma", under: [{ card: "BT11-077", as: "saved" }] }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT2-067", as: "theirBase" }],
          hand: [{ card: "BT10-076", as: "theirTroopmon" }, "BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("theirBase").permanentId,
        instanceId: s.inst("theirTroopmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("theirBase").topCard.cardId === "BT10-076");
    await settle(() => false, 40);

    expect(s.perm("ryoma").isSuspended).toBe(false);
    expect(s.perm("ryoma").stack.map(({ cardId }) => cardId)).toEqual(["BT11-077"]);
    expect(s.perm("theirBase").stack.map(({ cardId }) => cardId)).toEqual(["BT2-067"]);
    expect(observe(s.engine).hasKeyword(s.perm("theirBase"), "Alliance")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Security] plays itself for free when a real attack checks it", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "ryoma" }, "BT1-009"],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    await settle(() => false, 40);

    // The Tamer left security and entered the battle area; its play cost of 4 was not paid.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBeforeAttack);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("peer: EX10-023 Quartzmon's cost-7 route needs this exact Tamer IN PLAY, not in the trash", async () => {
    const inPlay = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-018", as: "astamon" },
          { card: CARD_ID, as: "ryoma" },
        ],
        hand: [{ card: "EX10-023", as: "quartz" }, "BT1-013"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    inPlay.state.memory = 7;
    await inPlay.ready();
    expect(
      inPlay.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: inPlay.perm("astamon").permanentId,
        instanceId: inPlay.inst("quartz").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => inPlay.perm("astamon").topCard.cardId === "EX10-023");
    expect(inPlay.state.memory).toBe(0);

    const inTrash = setupEngine({
      0: {
        battleArea: [{ card: "EX10-018", as: "astamon" }],
        trash: [{ card: CARD_ID, as: "ryoma" }],
        hand: [{ card: "EX10-023", as: "quartz" }, "BT1-013"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    inTrash.state.memory = 7;
    await inTrash.ready();
    expect(
      inTrash.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: inTrash.perm("astamon").permanentId,
        instanceId: inTrash.inst("quartz").instanceId,
        alternateRequirementIndex: 0,
      }).ok,
    ).toBe(false);
  });
});
