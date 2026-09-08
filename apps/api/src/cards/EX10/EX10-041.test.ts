import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-041.js";
import "../index.js";

const CARD_ID = "EX10-041";

/**
 * EX10-041 Wizardmon (Lv.4 Purple/Yellow, [Wizard]/[Witchelny], DP 5000).
 *
 * Printed clauses:
 *  1. "[Digivolve] Lv.3 w/[Evil] trait: Cost 2" — an alternate digivolution route.
 *  2. "When effects trash this card from the deck or security stack, give 1 of your
 *     opponent's Digimon ＜Security A. -1＞ until their turn ends."
 *  3. "[On Play] [When Digivolving] By trashing your top security card, trash the top 2
 *     cards of your deck and all of your opponent's Digimon get -3000 DP for the turn."
 *  4. Inherited: "＜Barrier＞".
 *
 * KB Q5122 (2025-09-05) is binding on clause 2: it does NOT trigger when this card is
 * merely among cards REVEALED from the deck or security stack and then trashed. Both
 * negative controls below (a reveal-and-trash search, and an ordinary security check)
 * assert the absence of the grant, and both positives drive a real public intent.
 *
 * P-017 DemiDevimon is the workhorse fixture: a Lv.3 Purple [Evil] Digimon whose whole
 * text is "[On Play] Trash the top 2 cards of your deck", so it is both the direct-mill
 * source for clause 2 and the legal alternate digivolution source for clause 1.
 */
describe("EX10-041 Wizardmon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Wizardmon",
      colors: ["Purple", "Yellow"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Wizard", "Witchelny"],
      inheritedEffectText: "＜Barrier＞",
    });
  });

  it("maps every printed clause onto the compiled IR", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Evil"], cost: 2, isAlternate: true }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "whenTrashedFromDeck", sourceFilter: { isSelfRef: true } }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDiscardSecurity")).toMatchObject({
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "CostGatedBlock",
            cost: {
              kind: "trash",
              target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            },
            optional: true,
            abortOnDecline: true,
            actions: [
              { kind: "TrashTopDeck", controller: "mine", amount: 2 },
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
                amount: -3000,
                duration: "forTheTurn",
              },
            ],
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier" }],
    });
    // The deck watcher must carry no attribution flag: `whenTrashedFromDeck` only fires from the
    // TrashTopDeck / DeleteOrTrash deck seams (already effect-only), and `requireByEffect` reads a
    // payload field those seams never set, so either flag is dead or actively silences the clause.
    const deckWatcher = compiled.effects?.find((effect) => effect.trigger === "AllTurns")?.actions?.[0];
    expect(deckWatcher).not.toHaveProperty("byEffect");
    expect(deckWatcher).not.toHaveProperty("requireByEffect");
  });

  it("Q5122 positive: an effect that mills it straight off the deck gives Security A. -1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-017", as: "demidevimon" }],
          deck: [{ card: CARD_ID, as: "wizard" }, "BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wizard").instanceId);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the watcher is self-scoped: milling OTHER cards while it sits in the deck grants nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-017", as: "demidevimon" }],
          deck: ["BT1-009", "BT1-013", { card: CARD_ID, as: "wizard" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle(() => false, 40);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("wizard").instanceId]);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5122 negative: being revealed by a search and then trashed does NOT give Security A. -1", async () => {
    // BT3-051 Dokugumon: "[On Play] Reveal the top 3 cards of your deck. Add 1 level 5 and
    // 1 level 6 Digimon card among them to your hand. Trash the remaining cards." The two
    // adds are unambiguous (one Lv.5 and one Lv.6 are revealed), so Wizardmon is the card
    // that lands in the trash — from the REVEALED set, not straight off the deck.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-051", as: "dokugumon" }],
          deck: [
            { card: CARD_ID, as: "wizard" },
            { card: "BT1-020", as: "lv5" },
            { card: "BT1-080", as: "lv6" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wizard").instanceId));
    await settle(() => false, 40);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("wizard").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lv5").instanceId, s.inst("lv6").instanceId]),
    );
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5122 negative: an ordinary security check that trashes it does NOT give Security A. -1", async () => {
    const s = setupEngine({
      0: { security: [{ card: CARD_ID, as: "wizard" }], hand: ["BT1-013"], deck: ["BT1-009", "BT1-013", "BT1-014"] },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
        hand: ["BT1-013"],
        deck: ["BT1-009", "BT1-013", "BT1-014"],
        security: ["BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Seat 0 has no Digimon, so no block window opens: the attack goes straight to the
    // security check that reveals and trashes the Wizardmon security card.
    await settle(() => s.state.players[0]!.security.length === 0);
    await settle(() => false, 40);

    // The checked Wizardmon lost its battle against the 20000 DP attacker and went to trash,
    // but a security CHECK is not "effects trash this card", so the attacker keeps its
    // Security Attack value.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([CARD_ID]);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays the On Play security cost, mills 2, and gives EVERY opposing Digimon -3000 DP", async () => {
    // The trashed top security card is a second Wizardmon, so the same intent also proves
    // the security half of clause 2: an EFFECT (this card's own cost) trashed it from the
    // security stack, and it grants ＜Security A. -1＞ from there.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "wizard" }],
          security: [
            { card: CARD_ID, as: "securityWizard" },
            { card: "BT1-010", as: "bottomSecurity" },
          ],
          deck: [{ card: "BT1-009", as: "mill1" }, { card: "BT1-013", as: "mill2" }, "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 9000 },
            { card: "BT1-013", as: "second", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    // Aim the count:1 ＜Security A. -1＞ grant at a named recipient rather than an arbitrary one.
    const p1 = s.state.players[1]!;
    expect(p1.battleArea).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("second").currentDP === 4000);
    await settle(() => false, 40);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("securityWizard").instanceId,
        s.inst("mill1").instanceId,
        s.inst("mill2").instanceId,
      ]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.perm("first").currentDP).toBe(6000);
    expect(s.perm("second").currentDP).toBe(4000);
    // The trashed security copy handed exactly one opposing Digimon ＜Security A. -1＞.
    const granted = p1.battleArea.filter(
      (permanent) => observe(s.engine).keywordAmount(permanent, "SecurityAttack") === -1,
    );
    expect(granted).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the security cost aborts the whole block: no mill, no DP change", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "wizard" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: [
            { card: "BT1-009", as: "mill1" },
            { card: "BT1-013", as: "mill2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "first", dp: 9000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => false, 40);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("first").currentDP).toBe(9000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves for cost 2 off a Lv.3 [Evil] source and fires the same clause When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-017", as: "source" }],
          hand: [{ card: CARD_ID, as: "wizard" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: [
            { card: "BT1-013", as: "bonusDraw" },
            { card: "BT1-009", as: "mill1" },
            { card: "BT1-014", as: "mill2" },
            "BT1-013",
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceInstanceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("wizard").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === CARD_ID);
    await settle(() => false, 40);

    // The alternate route costs 2 (the printed Purple/Yellow Lv.3 routes cost 3), so
    // `useAlternateCost` is proved by the memory endpoint, not by `{ ok: true }` alone.
    expect(s.state.memory).toBe(3);
    const wizard = s.perm("wizard");
    expect(wizard.topCard.cardId).toBe(CARD_ID);
    expect(wizard.stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    // Digivolving draws 1; the [When Digivolving] block then trashed security and milled 2.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("security").instanceId, s.inst("mill1").instanceId, s.inst("mill2").instanceId]),
    );
    expect(s.perm("victim").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the alternate route from a Lv.3 source without the [Evil] trait", async () => {
    const s = setupEngine({
      0: {
        // BT1-009 is a Red Lv.3 with no [Evil] trait: neither the printed Purple/Yellow Lv.3
        // routes nor the alternate [Evil] route accepts it.
        battleArea: [{ card: "BT1-009", as: "source" }],
        hand: [{ card: CARD_ID, as: "wizard" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("source").permanentId,
      instanceId: s.inst("wizard").instanceId,
      useAlternateCost: true,
    });
    expect(result.ok).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("wizard").instanceId]);
    expect(s.perm("source").topCard.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(10);
  });

  it('the -3000 DP is "for the turn" and is gone once the turn it resolved on ends', async () => {
    // Mutation check for the `forTheTurn` duration: under `untilOpponentTurnEnd` the debuff
    // on the opponent's Digimon would survive seat 0's own turn end.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "wizard" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }], deck: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").currentDP === 6000);
    expect(s.perm("victim").currentDP).toBe(6000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("victim").currentDP).toBe(9000);
  });

  it('＜Security A. -1＞ lasts "until their turn ends": through my turn end and into theirs', async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-017", as: "demidevimon" }, "BT1-013"],
          deck: [{ card: CARD_ID, as: "wizard" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    // "their turn" is the OPPONENT's turn, so my own turn ending must not clear the grant —
    // the whole point of the clause is to shrink the opponent's security checks on their turn.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    // The consumed endpoint: a base ＜Security Attack 1＞ attacker at -1 checks NO security.
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013"]);

    // Their turn ends: the grant expires and my next turn opens without it.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants ＜Barrier＞ to a host built by real digivolutions, and not to the top card itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-017", as: "source" },
            { card: "BT10-079", as: "control" },
          ],
          hand: [
            { card: CARD_ID, as: "wizard" },
            { card: "BT10-079", as: "mummymon" },
          ],
          security: [{ card: "BT1-009", as: "security" }],
          deck: ["BT1-013", "BT1-009", "BT1-014", "BT1-013", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("wizard").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === CARD_ID);
    // As the TOP card, Wizardmon's own inherited ＜Barrier＞ does not apply to it.
    expect(observe(s.engine).hasKeyword(s.perm("wizard"), "Barrier")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wizard").permanentId,
        instanceId: s.inst("mummymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === "BT10-079");
    await settle(() => false, 40);

    const host = s.perm("mummymon");
    expect(host.stack.map((card) => card.cardId)).toEqual(["P-017", CARD_ID]);
    expect(observe(s.engine).hasKeyword(host, "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("control"), "Barrier")).toBe(false);
  });
});
