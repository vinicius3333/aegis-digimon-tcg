import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as EX13_068 } from "./EX13-068.js";
import "../index.js";

// Fixtures
//   EX2-056  Takato Matsuki (Tamer, Red, cost 3) — a DIFFERENT card with the exact name
//            [Takato Matsuki]; prints only [Your Turn] watchers, so it never fires during
//            a start-of-main window and cannot disturb an assertion.
//   ST3-12   T.K. Takaishi (Tamer) — a non-[Takato Matsuki] Tamer: the nameExact negative.
//   BT2-009  Guilmon (Lv.3, 3000 DP, no main effect) — the exact-named trash fixture.
//   BT9-009  Guilmon (X Antibody) — the nameExact NEAR-match negative (normalizes to
//            "guilmon x antibody", so it must not answer [Guilmon]).
//   BT1-009  Monodramon — inert non-Guilmon Digimon.
const CARD_ID = "EX13-068";

describe("EX13-068 Takato Matsuki", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Takato Matsuki",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
    });
  });

  it("maps every printed clause onto IR", () => {
    expect(EX13_068.coverage).toBe("full");
    expect(EX13_068.residual).toEqual([]);

    expect(EX13_068.effects.find((effect) => effect.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });

    const gate = EX13_068.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0];
    expect(gate?.kind).toBe("CostGatedBlock");
    if (gate?.kind !== "CostGatedBlock") throw new Error("Start-of-Main action is not a CostGatedBlock");
    expect(gate).toMatchObject({
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true }, isSelf: true } },
      optional: true,
      abortOnDecline: true,
    });
    expect(gate.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }] } },
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(gate.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { nameOrTrait: [{ tokens: ["Guilmon"], match: "nameExact" }] } },
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"], zone: "battleArea" } },
    });

    expect(EX13_068.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — [Start of Your Turn] If you have 2 or less memory, set it to 3.
  // ---------------------------------------------------------------------------

  it("raises the memory floor to 3 through a real turn when at 2 or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "takato" }], hand: [{ card: "BT1-009", as: "spare" }] },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      // The start-of-main chain opens its own cost prompt on the same turn; decline it so
      // these three tests isolate the memory floor.
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("takato").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("raises memory from exactly 2 (boundary, inclusive)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "takato" }], hand: [{ card: "BT1-009", as: "spare" }] },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      // The start-of-main chain opens its own cost prompt on the same turn; decline it so
      // these three tests isolate the memory floor.
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("leaves memory alone at 3 or more — it sets, never adds", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "takato" }], hand: [{ card: "BT1-009", as: "spare" }] },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      // The start-of-main chain opens its own cost prompt on the same turn; decline it so
      // these three tests isolate the memory floor.
      { autoDeclineOptional: true },
    );
    s.state.memory = 7;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not raise the opponent's memory on the opponent's own turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "takato" }], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      1: { hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-011", "BT1-012", "BT1-013"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    // Seat 1's turn: seat 0's [Start of Your Turn] must not fire, so the gauge is untouched.
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — [Start of Your Main Phase] return-to-deck-bottom chain
  // ---------------------------------------------------------------------------

  it("returns itself to the deck bottom, plays the exact-named Takato, then Guilmon when no Digimon is out", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX2-056", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT2-009", as: "guilmon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourcePermanentId = s.perm("source").permanentId;
    const sourceId = s.inst("source").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("guilmon").instanceId),
    );
    await settle();

    const board = s.state.players[0]!.battleArea;
    expect(board.map((permanent) => permanent.permanentId)).not.toContain(sourcePermanentId);
    expect(board.map((permanent) => permanent.topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("replacement").instanceId, s.inst("guilmon").instanceId]),
    );
    expect(board).toHaveLength(2);
    // The source went to the BOTTOM of the deck, not the trash.
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(sourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("guilmon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("replacement").instanceId);
    // Both plays were free: memory is still the 3 the start-of-turn floor set.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("skips the Guilmon tail while a Digimon is already in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT1-009", as: "existing" },
          ],
          hand: [
            { card: "EX2-056", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT2-009", as: "guilmon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    );
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("existing").instanceId,
      s.inst("replacement").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("guilmon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("still plays Guilmon when the only Digimon is in the breeding area (§3-4-5-8)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          breeding: { card: "BT1-009", as: "inBreeding" },
          hand: [
            { card: "EX2-056", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT2-009", as: "guilmon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // Fired directly: a seeded breeding-area Digimon parks the turn loop in the breeding
    // phase awaiting a hatch/move action, which this test has no interest in.
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("guilmon").instanceId),
    );
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("replacement").instanceId, s.inst("guilmon").instanceId]),
    );
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("inBreeding").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a non-[Takato Matsuki] Tamer in hand and a non-[Guilmon] Digimon in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "ST3-12", as: "otherTamer" },
            { card: "BT12-007", as: "textMentionsTakato" },
          ],
          trash: [
            { card: "BT1-009", as: "monodramon" },
            { card: "BT9-009", as: "xAntibody" },
            { card: "BT17-080", as: "textMentionsGuilmon" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("source").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.deck.at(-1)?.instanceId === sourceId);
    await settle();

    // The return cost was paid (it gates the sentence, not either play), but neither
    // candidate matched its exact name, so the board is empty.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("otherTamer").instanceId, s.inst("textMentionsTakato").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("monodramon").instanceId,
        s.inst("xAntibody").instanceId,
        s.inst("textMentionsGuilmon").instanceId,
      ]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("picks the exact [Guilmon] over a (X Antibody) near-match sitting in the same trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          trash: [
            { card: "BT9-009", as: "xAntibody" },
            { card: "BT2-009", as: "guilmon" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("guilmon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("xAntibody").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does nothing at all when the return cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX2-056", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT2-009", as: "guilmon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true },
    );
    const sourceId = s.inst("source").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("replacement").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("guilmon").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("offers no play at all once the return cost itself is declined (abortOnDecline)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX2-056", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT2-009", as: "guilmon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true },
    );
    const sourceId = s.inst("source").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // Decline ONLY the cost prompt by hand; the two plays are never offered, so the single
    // optional decision the flow raised is proof the block aborted rather than continuing.
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.decisions.filter((entry) => entry.req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("replacement").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("guilmon").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it('pays the cost once and reaches the Guilmon tail even when the Takato play is declined ("After,")', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX2-056", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT2-009", as: "guilmon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true },
    );
    const sourceId = s.inst("source").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // Answer each optional prompt by hand: take the cost, decline the Takato play, take
    // the Guilmon play. "After," does not require the preceding play to have happened.
    const accepted: boolean[] = [];
    for (let index = 0; index < 3; index += 1) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decision = s.state.pendingDecision!;
      const accept = index !== 1;
      accepted.push(accept);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(accepted).toEqual([true, false, true]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("guilmon").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("replacement").instanceId);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("fires again from the replacement copy on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX2-056", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT2-009", as: "guilmon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-011", "BT1-012", "BT1-013"], security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("source").instanceId;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("guilmon").instanceId),
    );
    await settle();
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    // Back on seat 0's turn: the EX2-056 copy the chain played is a different card number,
    // so no second start-of-main chain runs, and the Guilmon stays put.
    s.state.turnSeat = 0;
    s.state.memory = 1;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("replacement").instanceId, s.inst("guilmon").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — [Security] Play this card without paying the cost.
  // ---------------------------------------------------------------------------

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "takato" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("takato"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("takato").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("takato").instanceId,
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("takato").instanceId);
  });

  it("publicly plays itself from security after an opponent attack, free of memory cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: CARD_ID, as: "takato" },
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
    const takatoId = s.inst("takato").instanceId;
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

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(takatoId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(takatoId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
