import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled as EX13_072 } from "./EX13-072.js";
import "../index.js";

// Fixtures (every peer module is loaded through `../index.js`, so each behaves as printed):
//   BT20-051 Raptordramon — Black/Yellow Lv.4, 6000 DP, traits [Cyborg]/[X Antibody]/[Chronicle].
//            The MATCHING attacker. Prints only a [Digivolve] header and a [When Digivolving]
//            clause, so nothing of its own fires on a plain attack.
//   BT13-063 Dorumon — Black Lv.3, 3000 DP, traits [Beast]/[X Antibody], NO printed text. The
//            NEAR-MATCH attacker: it carries the sibling trait that is printed next to
//            [Chronicle] on every BT20 Chronicle card, but not [Chronicle] itself.
//   BT1-013  Muchomon — Red Lv.3, 5000 DP, no effects: the wholly unrelated attacker.
//   P-204    Release of the Sealed Knight! — Black Option, use cost 3, traits
//            [X Antibody]/[Chronicle]. The MATCHING Option for the trait branch; its cost is
//            high enough for the "-1" to be observable, and it is Black, so this card's own
//            Black Tamer already satisfies the colour requirement a REDUCTION (unlike a waiver)
//            leaves in force (§4-22-3).
//   BT20-095 Fellowship of Hope's Keepers — Black Option, traits [X Antibody]/[Chronicle]; used
//            here only as the [Chronicle] trash-cost card for clause 1. It is deliberately NOT
//            the clause-2 Option fixture: its own [Main] ends with "place this card in the
//            battle area" and, used through this card, the instance ends up in no zone at all
//            (not hand, board, trash or deck) — a peer-module/self-place seam that would make
//            a clause-2 endpoint unassertable. Reported, not worked around by weakening a claim.
//   BT9-109  X Antibody — White Option, use cost 0, trait [X Antibody]. The MATCHING Option for
//            the `[X Antibody]` NAME branch. It waives its own colour requirement while its
//            controller has a Digimon in play, and its [Main] places itself under a Digimon.
//   BT9-104  X Digivolution! — Black Option, cost 3, trait [X Antibody]. The TRAIT near-match
//            negative: the sibling trait printed next to [Chronicle] on the BT20 cards, no
//            [Chronicle] of its own, and a name that is not [X Antibody].
//   NOT USED as a negative: EX5-070 X Antibody Proto Form. Its printed
//            "[Rule] Name: Also treated as [X Antibody]." makes it a genuine exact-name match
//            (`effectiveStaticNames`), so it is a true positive for the name branch, not a
//            near-miss — exactly the fixture trap the EX13 review notes warn about.
//   BT2-103  Spiral Sword — Black Option, cost 1, no traits: the unrelated negative.
//   BT1-009 / BT1-011 / BT1-012 — inert neutral Digimon used as spare hand cards, deck filler
//            and the defender's single security card.
const CARD_ID = "EX13-072";

describe("EX13-072 Kota Domoto", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Kota Domoto",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      types: ["Chronicle"],
    });
  });

  it("maps every printed clause onto IR", () => {
    expect(EX13_072.coverage).toBe("full");
    expect(EX13_072.residual).toEqual([]);
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(EX13_072);

    const gate = EX13_072.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0];
    expect(gate?.kind).toBe("CostGatedBlock");
    if (gate?.kind !== "CostGatedBlock") throw new Error("Start-of-Main action is not a CostGatedBlock");
    expect(gate).toMatchObject({
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] },
        },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(gate.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);

    const watcher = EX13_072.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("[Your Turn] action is not a SubTrigger");
    expect(watcher).toMatchObject({
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
    });
    expect(watcher.actions).toMatchObject([
      {
        kind: "UseOptionWithoutCost",
        from: ["hand"],
        payCost: true,
        reduceCostBy: 1,
        allowMultiColor: true,
        optional: true,
        filter: {
          controller: "mine",
          kind: ["Option"],
          nameOrTrait: [
            { tokens: ["X Antibody"], match: "nameExact" },
            { tokens: ["Chronicle"], match: "trait" },
          ],
        },
      },
    ]);
    // A reduction, never a waiver: the printed clause says "with the cost reduced by 1".
    expect(watcher.actions[0]).not.toHaveProperty("waiveColorRequirement");
    // No printed cost ceiling, so none is encoded (a `playCostLte` would silently cap the use).
    expect(watcher.actions[0]).not.toHaveProperty("playCostLte");

    expect(EX13_072.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — [Start of Your Main Phase] By trashing 1 [Chronicle] trait card
  //            from your hand, ＜Draw 1＞ and gain 1 memory.
  // ---------------------------------------------------------------------------

  it("trashes a [Chronicle] card from hand for a draw and a memory through a real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [
            { card: "BT20-095", as: "chronicleCard" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chronicleCard").instanceId),
    );
    await settle();
    const memoryAfterGate = s.state.memory;

    // The [Chronicle] card left the hand for the trash.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("chronicleCard").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("chronicleCard").instanceId);
    // One card was drawn, so the hand is back to its starting size and the deck is one shorter.
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    // The memory gain is the gauge value observed while the controller still held priority.
    expect(memoryAfterGate).toBeGreaterThanOrEqual(1);
  });

  it("gains exactly 1 memory and draws exactly 1 when the cost is paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [
            { card: "BT20-095", as: "chronicleCard" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kota"));
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chronicleCard").instanceId),
    );
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the cost trashes nothing, draws nothing and gains no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [
            { card: "BT20-095", as: "chronicleCard" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 2;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kota"));
    await settle();

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("chronicleCard").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the sibling [X Antibody] trait: the trash cost is exact-[Chronicle] only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          // Both hand cards carry [X Antibody]; neither carries [Chronicle].
          hand: [
            { card: "BT9-104", as: "xAntibodyOption" },
            { card: "BT13-063", as: "xAntibodyDigimon" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kota"));
    await settle();

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("xAntibodyOption").instanceId,
      s.inst("xAntibodyDigimon").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [{ card: "BT20-095", as: "chronicleCard" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.length;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("chronicleCard").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — [Your Turn] When one of your [Chronicle] trait Digimon attacks, by
  //            suspending this Tamer, you may use 1 [X Antibody] or 1 Option card
  //            with the [Chronicle] trait from your hand with the cost reduced by 1.
  // ---------------------------------------------------------------------------

  it("suspends itself and uses a [Chronicle] Option for 1 less than its printed cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle();

    expect(s.perm("kota").isSuspended).toBe(true);
    // Printed use cost 3, reduced by 1: exactly 2 memory was paid.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the exactly-named [X Antibody] Option through the name branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [{ card: "BT9-109", as: "xAntibody" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("xAntibody").instanceId));
    await settle();

    expect(s.perm("kota").isSuspended).toBe(true);
    // Printed use cost 0 reduced by 1 cannot go below 0: no memory moved.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("xAntibody").instanceId);
  });

  it("rejects a sibling-trait and an unrelated Option: neither branch matches, so nothing is used", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [
            { card: "BT9-104", as: "traitNearMiss" },
            { card: "BT2-103", as: "unrelated" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    // No Option matched either printed branch, so nothing was used and no memory moved.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("traitNearMiss").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    // The suspend cost was still paid: `autoAcceptOptional` accepts the cost window before the
    // empty candidate set is known, the documented "a chosen 'may' pays first, finds nothing to
    // hit, and the cost is not refunded" behaviour (EX13 review notes). A human controller who
    // sees no eligible Option simply declines, so this is harness bookkeeping, not a rules claim.
    expect(s.perm("kota").isSuspended).toBe(true);
  });

  it("declining leaves the Tamer unsuspended, the Option in hand and memory untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ignores an attacker carrying only the sibling [X Antibody] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT13-063", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("ignores a wholly unrelated attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT1-013", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("ignores the OPPONENT's [Chronicle] Digimon attacking — the clause reads 'your'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [{ card: "P-204", as: "option" }],
          security: ["BT1-011"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT20-051", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — [Security] Play this card without paying the cost.
  // ---------------------------------------------------------------------------

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: CARD_ID, as: "security", faceUp: true }], deck: ["BT1-011", "BT1-012"] },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));
    await settle();

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID);
    expect(played?.topCard?.instanceId).toBe(s.inst("security").instanceId);
    // Printed play cost 4 was waived entirely.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("security").instanceId);
  });
});
