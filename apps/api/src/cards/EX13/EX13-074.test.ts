import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as EX13_074 } from "./EX13-074.js";
import "../index.js";

// Fixtures
//   ST13-12  Knightmon (Lv.5 Black/Red, 7000 DP) — NO printed text at all: the "[Knightmon] text"
//            subject that matches purely by NAME, and an inert battle body.
//   EX4-042  DarkMaildramon (Lv.4 Black/Blue, 4000 DP) — NOT named Knightmon; its only printed
//            clause merely MENTIONS "[Knightmon]", so it is the text-not-name discriminator.
//            (REVIEW-NOTES' false-green trap does not apply: it is not "treated as" [Knightmon].)
//   BT18-058 Kotemon (Lv.3) — a [Knightmon] text CARD used only as a placement target; placing
//            never fires its [On Play].
//   EX10-026 SkullKnightmon — a [Knightmon] text card via its "[Digivolve] Lv.3 w/[Knightmon] in
//            text" header, proving the gate counts requirement-header text too.
//   BT5-045  LordKnightmon (Yellow Lv.6, play cost 13) — the exact-named digivolve destination,
//            deliberately the QUIETEST LordKnightmon in the catalog (its clauses are [When
//            Attacking] and a passive DP bump), and a color/level combination no printed
//            requirement could ever reach from a Purple/Black Tamer.
//   BT19-073 LordKnightmon (X Antibody) — the nameExact NEAR-match negative.
//   EX13-064 LordKnightmon — this card's own set-mate, which prints "[Digivolve] While you have 3
//            or fewer security cards, [Rie Kishibe]: Cost 5"; used to prove the printed cost-3
//            override is what gets paid.
//   BT1-009  Monodramon / BT1-010 / BT1-011 — inert non-[Knightmon] fixtures and spare hand cards.
//   BT1-024  MetalTyrannomon (10000 DP, no text) — the inert battle body that kills a 7000 DP
//            attacker so a DELETION happens through a public attack intent.
const CARD_ID = "EX13-074";

function mainEffectKey(s: ReturnType<typeof setupEngine>, alias = "rie"): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm(alias).topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
    entry.effectKey.startsWith(`${CARD_ID}/`),
  );
  if (effect === undefined) throw new Error("EX13-074 did not surface its Main effect");
  return effect.effectKey;
}

function activateMain(s: ReturnType<typeof setupEngine>, alias = "rie"): { ok: boolean; reason?: string } {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm(alias).topCard!.instanceId,
    effectKey: mainEffectKey(s, alias),
  }) as { ok: boolean; reason?: string };
}

describe("EX13-074 Rie Kishibe", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Rie Kishibe",
      colors: ["Purple", "Black"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["CS"],
      effectText: expect.stringContaining("[Main] [Once Per Turn] If this Tamer has 3 or more [Knightmon] text cards"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("maps every printed clause onto IR", () => {
    expect(EX13_074.coverage).toBe("full");
    expect(EX13_074.residual).toEqual([]);

    // Clause 1.
    expect(EX13_074.effects.find((effect) => effect.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });

    // Clause 2: one [All Turns] [Once Per Turn] window holding both event forms, which share a
    // single per-turn budget through one `oncePerTurnKey`.
    const watcher = EX13_074.effects.find((effect) => effect.trigger === "AllTurns");
    expect(watcher?.frequency).toBe("OncePerTurn");
    expect(watcher?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
          printedTextOnly: true,
        },
        actions: [
          {
            kind: "Draw",
            amount: 1,
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "target",
              underFilter: { isSelfRef: true },
              target: {
                count: 1,
                from: ["hand", "trash"],
                filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
              },
            },
          },
        ],
      },
      { kind: "SubTrigger", event: "onDeletionOf" },
    ]);
    const keys = (watcher?.actions ?? []).map((action) =>
      action.kind === "SubTrigger" ? action.oncePerTurnKey : undefined,
    );
    expect(keys[0]).toBeDefined();
    expect(keys[0]).toBe(keys[1]);

    // Clause 3.
    const main = EX13_074.effects.find((effect) => effect.trigger === "Main");
    expect(main?.frequency).toBe("OncePerTurn");
    expect(main?.condition).toMatchObject({
      kind: "selfDigivolutionStackCountAtLeast",
      count: 3,
      filter: { nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
    });
    expect(main?.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, isSelf: true },
      into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["LordKnightmon"], match: "nameExact" }] },
      from: ["hand", "trash"],
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
    });

    // Security.
    expect(EX13_074.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true } } }],
    });
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — [Start of Your Turn] If you have 2 or less memory, set it to 3.
  // ---------------------------------------------------------------------------

  it("raises the memory floor to 3 through a real turn when at 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("rie").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("raises memory from exactly 2 (boundary, inclusive)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("leaves memory alone at 3 or more — it sets, never adds", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 7;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not raise memory on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
      1: { hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — [All Turns] [Once Per Turn] When any of your [Knightmon] text
  // Digimon are played or deleted, by placing 1 such card from your hand or
  // trash under this Tamer, ＜Draw 1＞
  // ---------------------------------------------------------------------------

  it("places a [Knightmon] text card from hand under itself and draws 1 when such a Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [
            { card: "ST13-12", as: "knightmon" },
            { card: "BT18-058", as: "kotemon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();

    // Exact endpoints: the placed card is now a face-down card under the Tamer, the drawn card
    // left the deck for the hand, and the played Knightmon is the only new permanent.
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "EX13-074",
      "ST13-12",
    ]);
    // Play cost 5 out of 8 memory; the clause itself costs nothing but the placement.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires for a Digimon that only MENTIONS [Knightmon] in its text, not just a named one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [{ card: "EX4-042", as: "darkMaildramon" }],
          trash: [{ card: "EX10-026", as: "skullKnightmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkMaildramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();

    // The placed card came from the TRASH half of "from your hand or trash".
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("skullKnightmon").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("does not fire for a Digimon with no [Knightmon] anywhere in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [
            { card: "BT1-009", as: "monodramon" },
            { card: "BT18-058", as: "kotemon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monodramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 300);

    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire for the OPPONENT's [Knightmon] text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [{ card: "BT18-058", as: "kotemon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          hand: [
            { card: "ST13-12", as: "theirKnightmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    // The gauge is read turn-relative: during seat 1's turn a positive value is seat 1's memory.
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirKnightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 300);

    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
  });

  it("fires when your [Knightmon] text Digimon is DELETED in a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rie" },
            { card: "ST13-12", as: "knightmon" },
          ],
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // 7000 DP into 10000 DP: the attacker loses the battle and is deleted.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("knightmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["ST13-12"]);
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not treat a Digimon that merely CARRIES a [Knightmon] card in its stack as a [Knightmon] text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rie" },
            // Printed top card: MetalTyrannomon, no [Knightmon] anywhere in its own information.
            // Its digivolution cards include a Knightmon — effects are inherited, text is not
            // (comprehensive §4-23-2), so this deletion must NOT fire the clause. Mutation note:
            // dropping `printedTextOnly` leaves this test green, because the deletion watcher
            // reads the deleted card's definition rather than the live permanent's stack text —
            // the assertion is of the printed outcome, not of that flag.
            { card: "BT1-024", as: "carrier", under: ["ST13-12"] },
          ],
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // 10000 DP into 12000 DP: the carrier is deleted in battle.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-024", "ST13-12"]);
    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kotemon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("declining the placement cost draws nothing and leaves the stack empty", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [
            { card: "ST13-12", as: "knightmon" },
            { card: "BT18-058", as: "kotemon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 300);

    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("spends ONE use per turn across both event forms, and resets on your next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rie" },
            { card: "ST13-12", as: "knightmon" },
          ],
          hand: [
            { card: "ST13-12", as: "secondKnightmon" },
            { card: "BT18-058", as: "firstPlacement" },
            { card: "EX10-026", as: "secondPlacement" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "wall", suspended: true }],
          hand: [{ card: "BT1-009", as: "theirSpare" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // First event this turn: a PLAY. The use is spent.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondKnightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("firstPlacement").instanceId]);

    // Second event, the OTHER form (a deletion) in the same turn: refused by the shared budget.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("knightmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["ST13-12"]);
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("firstPlacement").instanceId]);
    const handAfterFirstTurn = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handAfterFirstTurn).toContain(s.inst("secondPlacement").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    // The opponent's turn, then back to ours: the use resets and the clause fires again.
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const anotherKnightmon = s.state.players[0]!.hand.find((card) => card.cardId === "ST13-12");
    expect(anotherKnightmon).toBeUndefined();
    // Re-arm with a fresh play: the Knightmon drawn back is not available, so delete-fire is
    // proven instead by playing the remaining [Knightmon] text card from hand.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlacement").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 2);
    await settle();

    expect(s.perm("rie").stack).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — [Main] [Once Per Turn] If this Tamer has 3 or more [Knightmon]
  // text cards under it, it may digivolve into [LordKnightmon] in the hand or
  // trash for a digivolution cost of 3, ignoring digivolution requirements.
  // ---------------------------------------------------------------------------

  it("digivolves itself into [LordKnightmon] for exactly 3, ignoring every printed requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          hand: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "BT5-045");
    await settle();

    // A Yellow Lv.6 with a printed "Lv.5" EvoCost onto a PURPLE/BLACK Tamer: no printed route
    // exists, so the digivolve is proof of `ignoreRequirements`, and 6 -> 3 proves the printed
    // "digivolution cost of 3" was what was paid.
    expect(s.state.memory).toBe(3);
    expect(s.perm("rie").topCard?.instanceId).toBe(s.inst("lord").instanceId);
    // Source identity survives: the Tamer sits directly beneath the new top card, with the three
    // placed cards still under it in their original order.
    expect(s.perm("rie").stack.map((card) => card.cardId)).toEqual(["ST13-12", "BT18-058", "EX10-026", "EX13-074"]);
    // The digivolve's rules-mandated bonus draw replaces the card that left the hand.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes the printed cost-3 route rather than its set-mate's own [Rie Kishibe] cost-5 route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          hand: [{ card: "EX13-064", as: "lord" }],
          security: [{ card: "BT1-010", as: "sec" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "EX13-064");
    await settle();

    // EX13-064's own header offers "[Rie Kishibe]: Cost 5" while this clause prints 3; the
    // gauge says which one the engine charged.
    expect(s.state.memory).toBe(3);
    expect(s.perm("rie").topCard?.instanceId).toBe(s.inst("lord").instanceId);
  });

  it("refuses to digivolve with only 2 [Knightmon] text cards under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "BT1-009"] }],
          hand: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    activateMain(s);
    await settle(() => false, 300);

    // Whether the gate refuses the intent or resolves to nothing, the board must be untouched.
    expect(s.perm("rie").topCard?.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("lord").instanceId]);
  });

  it("counts three [Knightmon] text cards that are not all named Knightmon", async () => {
    const s = setupEngine(
      {
        0: {
          // None of these three is NAMED Knightmon: two carry it in a [Digivolve] header /
          // effect line, one merely mentions it. The gate still counts three.
          battleArea: [{ card: CARD_ID, as: "rie", under: ["BT18-058", "EX10-026", "EX4-042"] }],
          hand: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "BT5-045");
    await settle();

    expect(s.state.memory).toBe(3);
  });

  it("refuses [LordKnightmon (X Antibody)] — the bracketed name is exact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          hand: [{ card: "BT19-073", as: "xAntibody" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    activateMain(s);
    await settle(() => false, 300);

    expect(s.perm("rie").topCard?.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("xAntibody").instanceId]);
  });

  it("digivolves from the TRASH half of 'in the hand or trash'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          trash: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    const key = mainEffectKey(s);
    const tamerInstanceId = s.perm("rie").topCard!.instanceId;
    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "BT5-045");
    await settle();

    expect(s.perm("rie").topCard?.instanceId).toBe(s.inst("lord").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(6);

    // [Once Per Turn] cannot be distinguished from "the source left the battle area" here: a
    // successful activation turns the Tamer into a digivolution card, so nothing can activate the
    // clause a second time. The refusal below is the only observable endpoint.
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: tamerInstanceId, effectKey: key }).ok,
    ).toBe(false);
    await settle(() => false, 300);
    expect(s.perm("rie").topCard?.cardId).toBe("BT5-045");
    expect(s.state.memory).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // [Security] Play this card without paying the cost.
  // ---------------------------------------------------------------------------

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "rie" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("rie"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rie").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("rie").instanceId,
    ]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("rie").instanceId);
  });

  it("publicly plays itself from security after an opponent attack, free of memory cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: CARD_ID, as: "rie" },
            { card: "BT1-011", as: "remainingSecurity" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-012", as: "spare" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const rieId = s.inst("rie").instanceId;
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(rieId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(rieId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
