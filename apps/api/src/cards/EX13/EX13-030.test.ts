import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-030.js";

const CARD_ID = "EX13-030";
const SAMPSON = "BT13-098"; // Richard Sampson (Tamer, Yellow, cost 3)
const SAMPSON_EX13 = "EX13-071"; // the set's own [Richard Sampson] printing, same exact name
const OTHER_TAMER = "BT13-094"; // a Tamer whose name is NOT [Richard Sampson]

/** Fire the [When Attacking] window on a permanent without running a whole combat. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

function seedTurnLoop(s: ReturnType<typeof setupEngine>): void {
  for (const seat of [0, 1] as const) {
    for (let i = 0; i < 6; i += 1) s.give(seat, Zone.Deck, "BT1-009");
    if (s.state.players[seat]!.security.length === 0) s.give(seat, Zone.Security, "BT1-010");
  }
}

describe("EX13-030 Reppamon", () => {
  it("matches the catalog identity and the printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Reppamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "DATA SQUAD"],
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
    });
    const text = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(text).toContain("[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2");
    expect(text).toContain("＜Barrier＞");
    expect(text).toContain(
      "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card, " +
        "you may play 1 [Richard Sampson] from your hand or trash without paying the cost.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("＜Barrier＞");
    expect((getCardDefinition(CARD_ID)?.securityEffectText ?? "").trim()).toBe("");
    expect(compiled.effects.every((effect) => effect.isSecurity !== true)).toBe(true);
    // Both catalog printings of the exact name are legal targets of the printed clause.
    expect(getCardDefinition(SAMPSON)?.nameEn).toBe("Richard Sampson");
    expect(getCardDefinition(SAMPSON_EX13)?.nameEn).toBe("Richard Sampson");
    expect(getCardDefinition(OTHER_TAMER)?.nameEn).not.toBe("Richard Sampson");
  });

  it("compiles the shared play windows, both Barrier markers and the alternate header", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["DATA SQUAD"],
      cost: 2,
      isAlternate: true,
    });

    const playBody = {
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      target: {
        count: 1,
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Richard Sampson"], match: "nameExact" }] },
      },
      cost: {
        kind: "trash",
        target: { count: 1, filter: { controller: "mine", zone: "security", position: "top" } },
      },
    };
    const windows = compiled.effects.filter((effect) => effect.actions.length > 0);
    expect(windows.map((effect) => effect.trigger)).toEqual(["OnPlay", "WhenDigivolving", "WhenAttacking"]);
    for (const window of windows) {
      expect(window).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [playBody] });
    }
    // One printed [Once Per Turn] governs all three timings, so they share one ledger key.
    expect(new Set(windows.map((effect) => effect.sharedUseKey)).size).toBe(1);

    const barriers = compiled.effects.filter((effect) => effect.keywords !== undefined);
    expect(barriers).toHaveLength(2);
    expect(barriers.map((effect) => effect.isInherited === true)).toEqual([false, true]);
    for (const marker of barriers) {
      expect(marker).toMatchObject({ trigger: "Static", actions: [], keywords: [{ keyword: "Barrier" }] });
    }
  });

  it("digivolves for 2 over an off-colour Lv.3 [DATA SQUAD] source and keeps the source identity", async () => {
    const s = setupEngine({
      0: {
        // BT26-036 Lalamon: GREEN Lv.3 with the [DATA SQUAD] trait. The catalog EvoCost needs a
        // yellow Lv.3, so only the printed alternate header can reach this card from here.
        battleArea: [{ card: "BT26-036", as: "lalamon" }],
        hand: [{ card: CARD_ID, as: "reppamon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lalamon").permanentId,
        instanceId: s.inst("reppamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lalamon").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3); // the printed alternate cost of 2
    expect(s.perm("lalamon").stack.map(({ cardId }) => cardId)).toEqual(["BT26-036"]);
    expect(s.perm("lalamon").currentDP).toBe(5000);
    expect(s.state.players[0]!.deck.length).toBe(deckBefore - 1); // the digivolution draw
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("still digivolves over the printed yellow Lv.3 route without the [DATA SQUAD] trait", async () => {
    const s = setupEngine({
      0: {
        // BT1-050 Liollmon: YELLOW Lv.3 [Holy Beast], no [DATA SQUAD] trait — printed EvoCost only.
        battleArea: [{ card: "BT1-050", as: "liollmon" }],
        hand: [{ card: CARD_ID, as: "reppamon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("liollmon").permanentId,
        instanceId: s.inst("reppamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("liollmon").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(3);
    expect(s.perm("liollmon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-050"]);
  });

  it("refuses a near-matching [Data] trait Lv.3 and a trait-less Lv.3, both off-colour", async () => {
    for (const [card, alias] of [
      // P-061 Jellymon: blue Lv.3 whose only trait is [Data] — a substring of [DATA SQUAD] under a
      // case-insensitive read, but NOT the exact printed trait.
      ["P-061", "jellymon"],
      // BT1-009 Monodramon: red Lv.3 [Mini Dragon], no relation to either route.
      ["BT1-009", "monodramon"],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card, as: alias }],
          hand: [{ card: CARD_ID, as: "reppamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      });
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("reppamon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.state.memory).toBe(5); // nothing charged on either route
      expect(s.perm(alias).topCard.cardId).toBe(card);
    }
  });

  it("[On Play] trashes the top security card and plays [Richard Sampson] from the hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "reppamon" },
            { card: SAMPSON, as: "sampson" },
            { card: "BT1-010", as: "spare" },
          ],
          security: [
            { card: "BT1-009", as: "paid" },
            { card: "BT1-010", as: "remaining" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reppamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === SAMPSON));
    await settle(() => s.state.pendingDecision === undefined);

    // Reppamon's own play cost of 5 is the only memory movement: the Tamer came in for free.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID, SAMPSON]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("paid").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reaches the trash pool and the set's own [Richard Sampson] printing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "reppamon" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [{ card: SAMPSON_EX13, as: "trashedSampson" }],
          security: [{ card: "BT1-009", as: "paid" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reppamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === SAMPSON_EX13));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID, SAMPSON_EX13]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("paid").instanceId]);
  });

  it("ignores a Tamer that is not [Richard Sampson] and never spends the security card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "reppamon" },
            { card: OTHER_TAMER, as: "otherTamer" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [{ card: "BT1-011", as: "inertTrash" }],
          security: [{ card: "BT1-009", as: "untouched" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reppamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("otherTamer").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("inertTrash").instanceId]);
    expect(s.decisions.some(({ req }) => req.sourceCardId === CARD_ID)).toBe(false);
  });

  it("does nothing at all with an empty security stack, leaving the Tamer in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "reppamon" },
            { card: SAMPSON, as: "sampson" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.state.players[0]!.security).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reppamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    // manual §1: a "by" condition can never be paid partly, so the whole clause does nothing.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sampson").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("declining the window spends neither the security card nor the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reppamon" }],
          hand: [
            { card: SAMPSON, as: "sampson" },
            { card: "BT1-010", as: "spare" },
          ],
          security: [{ card: "BT1-009", as: "paid" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "reppamon");
    await settle(() => s.state.pendingDecision === undefined);

    // `abortOnDecline: true` keeps a declined window from paying anything: the cost is part of
    // the same optional clause. Whether the [Once Per Turn] quota itself survives the decline is
    // NOT asserted here — comprehensive §15-14-1-1 ("each activation counts toward 1 use") and
    // manual §1 ("once the player chooses to perform the 'by' condition, it will count toward 1
    // use") read differently, no KB ruling exists for this pre-release card, and the engine's
    // trigger-level accounting (`effects/stack.ts` `resolveOne`, which registers the use after
    // the body runs) treats the window as spent. P-187, the identical printed sentence, is
    // encoded the same way.
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("paid").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sampson").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("spends one shared use across [On Play] and the later timings, and reopens next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "reppamon" },
            { card: SAMPSON, as: "firstSampson" },
            { card: SAMPSON, as: "secondSampson" },
            { card: "BT1-010", as: "spare" },
          ],
          security: [
            { card: "BT1-009", as: "firstPaid" },
            { card: "BT1-010", as: "secondPaid" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reppamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === SAMPSON));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(1);
    const playedFirst = s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === SAMPSON);
    expect(playedFirst).toHaveLength(1);

    // Same turn, the [When Attacking] window: the SHARED gate refuses it.
    await attackWindow(s, "reppamon");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === SAMPSON)).toHaveLength(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondPaid").instanceId]);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    seedTurnLoop(s);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 4;
    await attackWindow(s, "reppamon");
    await settle(() => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === SAMPSON).length === 2);

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === SAMPSON)).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("secondPaid").instanceId);
  });

  it("opens the window on [When Digivolving] and keeps the source's inherited effect alive", async () => {
    const s = setupEngine(
      {
        0: {
          // ST24-02 Gaomon: BLUE Lv.3 [DATA SQUAD], so only the alternate header reaches
          // Reppamon. Its inherited "[When Attacking] [Once Per Turn] If your hand has 7 or
          // fewer cards, ＜Draw 1＞" is the observable proof that the source survives underneath.
          battleArea: [{ card: "ST24-02", as: "gaomon" }],
          hand: [
            { card: CARD_ID, as: "reppamon" },
            { card: SAMPSON, as: "sampson" },
            { card: "BT1-010", as: "spare" },
          ],
          security: [{ card: "BT1-009", as: "paid" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("reppamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === SAMPSON));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("gaomon").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("gaomon").stack.map(({ cardId }) => cardId)).toEqual(["ST24-02"]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("paid").instanceId]);

    // The inherited window of the card now underneath still fires for the new top card.
    const deckBefore = s.state.players[0]!.deck.length;
    await attackWindow(s, "gaomon");
    await settle(() => s.state.players[0]!.deck.length === deckBefore - 1);
    expect(s.state.players[0]!.deck.length).toBe(deckBefore - 1);
  });

  it("uses its printed ＜Barrier＞ to trash the top security card and survive a battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reppamon", suspended: true }],
          security: [
            { card: "BT1-009", as: "barrierCost" },
            { card: "BT1-010", as: "remaining" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        // BT1-080 Titamon: inert green Lv.6 with 12000 DP, a guaranteed battle win over 5000 DP.
        1: { battleArea: [{ card: "BT1-080", as: "attacker" }], deck: ["BT1-009"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("reppamon"), "Barrier")).toBe(true);

    s.state.turnSeat = 1;
    const reppamonId = s.perm("reppamon").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: reppamonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: reppamonId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === reppamonId)).toBe(true);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("barrierCost").instanceId);
  });

  it("never offers ＜Barrier＞ against an effect deletion (comprehensive §16-25-1 is battle-only)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "reppamon" }],
        security: [{ card: "BT1-009", as: "untouched" }],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    const reppamonId = s.perm("reppamon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([reppamonId], "byEffect")).toBe(1);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  it("grants inherited ＜Barrier＞ only while it sits under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
          { card: "BT1-013", as: "bystander" },
        ],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Barrier")).toBe(false);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
  });

  it("does not open its own play window from underneath another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", under: [{ card: CARD_ID }] }],
          hand: [
            { card: SAMPSON, as: "sampson" },
            { card: "BT1-010", as: "spare" },
          ],
          security: [{ card: "BT1-009", as: "untouched" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // The printed main clause is not an inherited effect: the host's attack must not reach it.
    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sampson").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  it("never reaches the opponent's [Richard Sampson] or their security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reppamon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          security: [{ card: "BT1-009", as: "mySecurity" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          hand: [{ card: SAMPSON, as: "opponentSampson" }],
          trash: [{ card: SAMPSON_EX13, as: "opponentTrashSampson" }],
          security: [{ card: "BT1-010", as: "opponentSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "reppamon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentSampson").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentTrashSampson").instanceId,
    ]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("mySecurity").instanceId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
