import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-064.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const CARD_ID = "EX10-064";
// A vanilla Red Rookie: playable so Main never auto-passes, and never a legal payment or
// DigiXros material for this card.
const NEUTRAL_HAND = "ST1-02";

describe("EX10-064 Yuu Amano & Nene Amano", () => {
  it("records the exact catalog and executable contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["General", "Bagra Army", "Twilight"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find(({ trigger }) => trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", target: { count: 1, from: ["hand", "trash"] }, position: "bottom" },
        },
      ],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "instead",
          sourceFilter: { controller: "mine", kind: ["Digimon"], hasDigiXrosRequirement: true },
          actions: [
            // `underTamers` is the only ZoneRef the material picker reads for "under your
            // Tamers"; the previous `tamerCards` token matched nothing there.
            { kind: "DigiXrosMaterialZoneExpansion", zones: ["underTamers", "trash"], cost: { kind: "suspend" } },
          ],
        },
      ],
    });
  });

  // --- [Start of Your Main Phase]: place 1 [Bagra Army]/[Twilight] Digimon card, ＜Draw 1＞ ---

  /**
   * My seat in a real turn loop: a playable neutral card so Main never auto-passes, plus an
   * aliased deck so a draw can be named. Aliases are global to a Board Spec, so only ONE seat
   * may carry them — the opponent gets the alias-free `opponentSeat`.
   */
  const mySeat = () => ({
    hand: [{ card: NEUTRAL_HAND, as: "neutral" }],
    security: ["BT1-009", "BT1-013", "BT1-014"],
    deck: [
      { card: "BT1-013", as: "deckA" },
      { card: "BT1-014", as: "deckB" },
      { card: "BT1-009", as: "deckC" },
    ],
  });

  const opponentSeat = () => ({
    hand: [NEUTRAL_HAND],
    security: ["BT1-009", "BT1-013", "BT1-014"],
    deck: ["BT1-013", "BT1-014", "BT1-009"],
  });

  it("Q5174 places a hand payment at the Tamer's true bottom and draws 1 at the natural start of my main phase", async () => {
    const s = setupEngine(
      {
        0: {
          ...mySeat(),
          hand: [
            { card: NEUTRAL_HAND, as: "neutral" },
            { card: "EX10-026", as: "material" },
          ],
          // Two cards already under the Tamer, so "bottom" is distinguishable from both
          // "directly beneath the Tamer" and "anywhere in the stack".
          battleArea: [
            {
              card: CARD_ID,
              as: "tamer",
              under: [
                { card: "BT1-009", as: "existingBottom" },
                { card: "BT1-013", as: "existingTop" },
              ],
            },
          ],
        },
        1: opponentSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Q5174: the payment goes to the BOTTOM of what is already under the Tamer. `stack` is
    // bottom-most first, so the new card takes index 0 and both seeded cards shift up.
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("existingBottom").instanceId,
      s.inst("existingTop").instanceId,
    ]);
    // ＜Draw 1＞: the first turn has no draw phase, so the deck's top card in hand is the
    // effect's own draw and nothing else moved. The negative cases below share this fixture
    // and end with `deckA` still on the deck, which is what makes this draw load-bearing.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("neutral").instanceId, s.inst("deckA").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckB").instanceId,
      s.inst("deckC").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5174 accepts a trash payment and places it under the Tamer, leaving the trash empty", async () => {
    const s = setupEngine(
      {
        0: {
          ...mySeat(),
          trash: [{ card: "EX10-027", as: "material" }],
          battleArea: [{ card: CARD_ID, as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
        },
        1: opponentSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("neutral").instanceId, s.inst("deckA").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("offers nothing when neither hand nor trash holds a [Bagra Army] or [Twilight] Digimon card", async () => {
    const s = setupEngine(
      {
        0: {
          ...mySeat(),
          // Right kind, wrong traits (Red [Giant Bird]); and a [Bagra Army] card that is a
          // Digi-Egg, not a Digimon card, so the `kind: ["Digimon"]` half of the gate holds.
          hand: [
            { card: NEUTRAL_HAND, as: "neutral" },
            { card: "BT1-014", as: "offTrait" },
          ],
          trash: [{ card: "BT26-006", as: "bagraEgg" }],
          battleArea: [{ card: CARD_ID, as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
        },
        1: opponentSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // No payment is possible, so `abortOnDecline` keeps the draw from happening: `deckA` is
    // still on the deck, exactly one card fewer in hand than the paid case above.
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("existing").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("neutral").instanceId, s.inst("offTrait").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckA").instanceId,
      s.inst("deckB").instanceId,
      s.inst("deckC").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("bagraEgg").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declines the optional payment and keeps the card and the draw", async () => {
    const s = setupEngine(
      {
        0: {
          ...mySeat(),
          hand: [
            { card: NEUTRAL_HAND, as: "neutral" },
            { card: "EX10-026", as: "material" },
          ],
          battleArea: [{ card: CARD_ID, as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
        },
        1: opponentSeat(),
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // "By placing ..." is a cost: declining keeps the card AND skips the draw entirely.
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("existing").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("neutral").instanceId, s.inst("material").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent at the start of the OPPONENT's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          ...mySeat(),
          battleArea: [{ card: CARD_ID, as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
        },
        1: opponentSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("existing").instanceId]);

    // Arm a legal payment only AFTER my own main phase, then hand the turn over.
    const armed = s.give(0, Zone.Hand, { card: "EX10-026", as: "armed" });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("existing").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(armed.instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("is inert while it sits in the trash or the hand", async () => {
    const s = setupEngine(
      {
        0: {
          ...mySeat(),
          hand: [
            { card: NEUTRAL_HAND, as: "neutral" },
            { card: CARD_ID, as: "inHand" },
            { card: "EX10-026", as: "material" },
          ],
          trash: [{ card: CARD_ID, as: "inTrash" }],
        },
        1: opponentSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // A Tamer only has effects in the battle area: neither copy may open a payment prompt
    // or draw, so the hand and the deck are exactly as they were laid.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("neutral").instanceId, s.inst("inHand").instanceId, s.inst("material").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("inTrash").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("unlocks no DigiXros zone while the Tamer is in the trash instead of the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX10-055", as: "tactimon" }],
        trash: [
          { card: CARD_ID, as: "tamerInTrash" },
          { card: "EX10-027", as: "trashMaterial" },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();
    // No expander permanent exists, so the trash zone is locked and the material is refused.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("trashMaterial").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("tamerInTrash").instanceId,
      s.inst("trashMaterial").instanceId,
    ]);
    expect(s.state.memory).toBe(12);
  });

  it("Q5175/Q5176 DigiXroses with one card under another Tamer and one from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-055", as: "tactimon" }],
          trash: [{ card: "EX10-027", as: "trashMaterial" }],
          battleArea: [
            { card: CARD_ID, as: "expander" },
            { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-055"),
    );
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("Q5175/Q5176 effect-play path pays the expander and consumes exactly one card from each extra zone", async () => {
    // This is the card-effect boundary: BT26-006's inherited effect plays the DigiXros card
    // through PlayWithoutCost { allowDigiXros: true }. There is deliberately no playCard
    // digiXros declaration and no client-supplied expanderPermanentIds shortcut.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "expander" },
            {
              card: "EX10-063",
              as: "otherTamer",
              under: [
                { card: "EX10-026", as: "underMaterial" },
                { card: "EX10-027", as: "underExtra" },
              ],
            },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [
            { card: "EX10-027", as: "trashMaterial" },
            { card: "EX10-026", as: "trashExtra" },
          ],
        },
        1: { security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Resolve the effect's real prompts explicitly. Auto-selecting the maximum here would
    // choose the attacker's top card plus both extra-zone cards, exceeding the two one-card
    // quotas and making the test pass without proving the printed payment.
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"), 5000);
    await settle(() => s.state.pendingDecision === undefined);

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId]),
    );
    expect(s.perm("otherTamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("underExtra").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("trashExtra").instanceId,
      s.inst("costA").instanceId,
      s.inst("costB").instanceId,
    ]);
    // EX10-058 costs 11; BT26-006 reduces by 2 and two DigiXros materials reduce by 4.
    expect(s.state.memory).toBe(0);
  });

  it("Q5178 adds the quotas from 2 separately suspended copies", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-034", as: "blastmon" }],
          trash: [
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
          battleArea: [
            { card: CARD_ID, as: "firstExpander" },
            { card: CARD_ID, as: "secondExpander" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blastmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId],
          expanderPermanentIds: [s.perm("firstExpander").permanentId, s.perm("secondExpander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-034"));
    expect(s.perm("firstExpander").isSuspended).toBe(true);
    expect(s.perm("secondExpander").isSuspended).toBe(true);
  });

  it("Q5178/Q5179 adds both copies' under-Tamer and trash quotas on effect play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "firstExpander" },
            { card: CARD_ID, as: "secondExpander" },
            {
              card: "EX10-063",
              as: "otherTamer",
              under: [
                { card: "EX10-026", as: "underA" },
                { card: "EX10-027", as: "underB" },
              ],
            },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [
            { card: "EX10-027", as: "trashA" },
            { card: "EX10-026", as: "trashB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("underA").instanceId, s.inst("underB").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
      5000,
    );
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("firstExpander").isSuspended).toBe(true);
    expect(s.perm("secondExpander").isSuspended).toBe(true);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("underA").instanceId, s.inst("underB").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("trashA").instanceId, s.inst("trashB").instanceId]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("Q5178 lets two replacement copies be accepted independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "firstExpander" },
            { card: CARD_ID, as: "secondExpander" },
            {
              card: "EX10-063",
              as: "otherTamer",
              under: [
                { card: "EX10-026", as: "underA" },
                { card: "EX10-027", as: "underB" },
              ],
            },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [
            { card: "EX10-027", as: "trashA" },
            { card: "EX10-026", as: "trashB" },
          ],
        },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    const costDecisionId = decision.decisionId;
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== costDecisionId &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 2,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const firstReplacementId = decision.decisionId;
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== firstReplacementId &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 3,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("underA").instanceId, s.inst("trashA").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
      5000,
    );
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("firstExpander").isSuspended).toBe(true);
    expect(s.perm("secondExpander").isSuspended).toBe(false);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("underA").instanceId, s.inst("trashA").instanceId]),
    );
    expect(played.stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("underB").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("trashB").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("fails the compiled quota mutation when its nested expansion action is removed", async () => {
    const runEffectPlay = async () => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX10-026",
                as: "attacker",
                under: [
                  { card: "BT26-006", as: "monimon" },
                  { card: "BT1-009", as: "costA" },
                  { card: "BT1-009", as: "costB" },
                ],
              },
              { card: CARD_ID, as: "expander" },
              { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
            ],
            hand: [{ card: "EX10-058", as: "played" }],
            trash: [{ card: "EX10-027", as: "trashMaterial" }],
          },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId);
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
        5000,
      );
      return {
        permanent: s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!,
        underMaterialId: s.inst("underMaterial").instanceId,
        trashMaterialId: s.inst("trashMaterial").instanceId,
      };
    };

    const original = await runEffectPlay();
    expect(original.permanent.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([original.underMaterialId, original.trashMaterialId]),
    );
    const mutant = structuredClone(compiled) as typeof compiled;
    const replacement = mutant.effects?.find(({ trigger }) => trigger === "AllTurns")?.actions?.[0];
    expect(replacement?.kind).toBe("Replacement");
    if (replacement?.kind === "Replacement") replacement.actions = [];
    registerIrCard(CARD_ID, mutant);
    try {
      const mutated = await runEffectPlay();
      let mutationRejected = false;
      try {
        expect(mutated.permanent.stack.map(({ instanceId }) => instanceId)).toEqual(
          expect.arrayContaining([mutated.underMaterialId, mutated.trashMaterialId]),
        );
      } catch {
        mutationRejected = true;
      }
      expect(mutationRejected).toBe(true);
    } finally {
      registerIrCard(CARD_ID, compiled);
    }
  });

  it("rejects the expander for a DigiXros card outside Bagra Army/Twilight", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-009", as: "shoutmon" }],
        trash: [{ card: "BT10-008", as: "material" }],
        battleArea: [{ card: CARD_ID, as: "expander" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shoutmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("material").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
  });

  it("[Security] plays itself for free out of a real security check", async () => {
    // The public route: seat 0 attacks the player, so seat 1's top security card is revealed
    // and its [Security] effect runs inside `runSecurityCheck` — no fired timing.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", dp: 4000, as: "attacker" }] },
      1: {
        security: [
          { card: CARD_ID, as: "tamer" },
          { card: "BT1-009", as: "next" },
        ],
      },
    });
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID),
    );

    const played = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(played.stack).toHaveLength(0);
    // It left security and never reached the trash — the checked card was PLAYED, not resolved.
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("next").instanceId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("tamer").instanceId);
    // "without paying the cost": the printed cost is 4, and no memory moved for the play.
    expect(getCardDefinition(CARD_ID)!.playCost).toBe(4);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("declines the optional expansion without suspending or consuming extra-zone materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "expander" },
            { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [{ card: "EX10-027", as: "trashMaterial" }],
        },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // First accept BT26-006's optional play branch. EX10-064's replacement then presents its
    // own optional choice; decline that second prompt to prove the original play continues.
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 1,
    );
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    const costDecisionId = decision.decisionId;
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== costDecisionId &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 2,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.decisions.length >= 5);
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
      5000,
    );
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("expander").isSuspended).toBe(false);
    expect(played.stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("underMaterial").instanceId);
    expect(played.stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("trashMaterial").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("trashMaterial").instanceId);
  });

  it("Q5175 places from the trash alone, leaving the cards under my Tamers untouched", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX10-055", as: "tactimon" }],
        trash: [{ card: "EX10-027", as: "trashMaterial" }],
        battleArea: [
          { card: CARD_ID, as: "expander" },
          { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();
    // "This effect also allows you to place a card from just one area" (Q5175): one trash
    // material and nothing from under a Tamer is a legal DigiXros.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("trashMaterial").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-055"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-055")!;
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("trashMaterial").instanceId]);
    expect(s.perm("otherTamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("underMaterial").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("expander").isSuspended).toBe(true);
    // EX10-055 costs 12; one DigiXros material reduces it by 2.
    expect(s.state.memory).toBe(2);
  });

  it("refuses a second activation of an already suspended copy in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX10-055", as: "first" },
            { card: "EX10-034", as: "second" },
          ],
          trash: [
            { card: "EX10-027", as: "trashA" },
            { card: "EX10-026", as: "trashB" },
          ],
          battleArea: [{ card: CARD_ID, as: "expander" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 30;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("first").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("trashA").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-055"));
    expect(s.perm("expander").isSuspended).toBe(true);

    // "by suspending this Tamer" is a real cost: a suspended copy cannot pay again, so the
    // second play in the same turn gets no trash material. (Q5177's own case — several cards
    // played at once off ONE activation — has no public intent: `playCard` plays one card.)
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("second").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("trashB").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    // Without naming the expander the trash zone stays locked, so the material is refused too.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("second").instanceId,
        digiXros: { materialInstanceIds: [s.inst("trashB").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("trashB").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("second").instanceId]);
  });

  // --- Q6961: a pending activation dies when its card leaves the trash -------------------

  /**
   * EX10-044 Damemon's inherited clause is "When effects trash this card from a [Bagra Army]
   * trait Digimon's digivolution cards, ＜Draw 1＞". BT26-006's [When Attacking] cost trashes it
   * from the [Bagra Army] attacker, arming that draw; EX10-064 then offers the trash as a
   * DigiXros source. Q6961: taking that same card as a material removes it from the trash
   * before the pending draw can activate, so the draw never happens.
   */
  const q6961Board = () => ({
    0: {
      battleArea: [
        {
          card: "EX10-026",
          as: "attacker",
          under: [
            { card: "BT26-006", as: "monimon" },
            { card: "EX10-044", as: "damemon" },
            { card: "BT1-009", as: "costB" },
          ],
        },
        { card: CARD_ID, as: "expander" },
        { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
      ],
      hand: [{ card: "EX10-058", as: "played" }],
      deck: [
        { card: "BT1-013", as: "deckA" },
        { card: "BT1-014", as: "deckB" },
      ],
    },
    1: { security: [{ card: "BT1-009", as: "security" }] },
  });

  const runQ6961 = async (pickDamemonAsMaterial: boolean) => {
    const s = setupEngine(q6961Board(), { autoAcceptOptional: true, autoChooseOption: true });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // 1. BT26-006's cost: trash Damemon and one inert card from the attacker's stack.
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("damemon").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });

    // 2. EX10-064's expanded material pick.
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    const materials = pickDamemonAsMaterial
      ? [s.inst("underMaterial").instanceId, s.inst("damemon").instanceId]
      : [s.inst("underMaterial").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: materials },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
      5000,
    );
    return s;
  };

  it("Q6961 control: the trashed digivolution card's draw fires when it stays in the trash", async () => {
    const s = await runQ6961(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("damemon").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckB").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckA").instanceId]);
  });

  it("Q6961 the pending draw is lost when the card is placed as a DigiXros material", async () => {
    const s = await runQ6961(true);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(played.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("damemon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("damemon").instanceId);
    // Q6961: "it's removed from the trash before the effect can activate" — no draw.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckA").instanceId,
      s.inst("deckB").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
