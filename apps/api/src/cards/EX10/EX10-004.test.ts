import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-004.js";

describe("EX10-004 Cupimon compiled contract", () => {
  it("models the inherited Lucemon breeding move effect and shared hand-trash cost", () => {
    const effect = compiled.effects?.[0];
    const move = effect?.actions?.[0];
    expect(effect).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(move).toMatchObject({
      kind: "SubTrigger",
      event: "whenMovedFromBreeding",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
    });
    expect(irNode(move).actions).toEqual([
      expect.objectContaining({
        kind: "Draw",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: expect.objectContaining({ kind: "trash" }),
      }),
      // No "if you do" is printed between the draw and the memory gain: both are results of
      // the one paid processing condition, and `abortOnDecline` on the Draw already stops the
      // sequence when the hand-trash cost is not paid.
      expect.objectContaining({ kind: "GainMemory", amount: 1 }),
    ]);
    expect(irNode(move).actions?.[1]?.condition).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  // KB Q5010: the effect triggers while this card sits in the digivolution cards of the
  // [Lucemon] Digimon that moves from the breeding area — the fixture's `under` placement.
  it("pays the hand-trash cost after a Lucemon stack moves from breeding, then draws and gains 1 memory", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [
            { card: "BT1-009", as: "discarded" },
            { card: "BT1-011", as: "spare" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("discarded").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.memory === memoryBefore + 1 &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("discarded").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.perm("lucemon").inBreeding).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.state.pendingDecision).toBeUndefined();

    // Structural re-fire kept as a second, narrower check of the same gate: this board has no
    // way to reach a second breeding move (the seat's one breeding action per turn is spent —
    // GameEngine `breeding.actionTaken`, §6-4 — and the breeding area is empty). The
    // natural-origin same-turn refusal lives in its own test below, which refills breeding with
    // an effect hatch and moves the second Lucemon by effect. The hand and deck still hold a
    // payable card and a drawable card, so a missing gate would show as a second trash + draw
    // + memory here.
    await advance(s.engine).fireSubTrigger("whenMovedFromBreeding", {
      subjectPermanentId: s.perm("lucemon").permanentId,
    });
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("does not trigger for a non-Lucemon breeding stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", as: "nonLucemon", under: ["EX10-004"] },
          hand: ["BT1-010"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("nonLucemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("keeps the hand and grants nothing when the cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: ["EX10-004"] },
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("still gains the memory when the paid draw finds an empty deck", async () => {
    // FAILS-WHEN-REVERTED: re-gating the GainMemory on `ifThisEffectActed` withholds the
    // memory here, because a 0-card draw leaves `lastEffectActed` false. The printed text
    // conditions both results on the hand trash alone.
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [{ card: "BT1-009", as: "discarded" }],
          deck: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === memoryBefore + 1);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("discarded").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("does nothing with an empty hand: the by-cost must be payable before the payload", async () => {
    // CR 15-7-2 / 15-7-4: a "By trashing 1 card in your hand" processing condition is paid
    // BEFORE its results. With no hand card the cost is unpayable, so there is no draw, no
    // trash, and no memory — the effect must not draw first and then trash what it drew.
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [],
          deck: [{ card: "BT1-010", as: "top" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("matches [Lucemon] as a substring of the name: Lucemon: Chaos Mode triggers it", async () => {
    // "with [Lucemon] in their names" is a substring gate (`match: "name"`), not an exact
    // name. BT7-111 Lucemon: Chaos Mode is a legal breeding top card (a breeding Digimon may
    // digivolve past level 4; the move itself only needs DP, §4-16-2) and its own effects are
    // [On Play] / [When Digivolving] only, so it stays inert here.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT7-111", as: "chaosMode", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [{ card: "BT1-009", as: "discarded" }, "BT1-011"],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("discarded").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("chaosMode").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.memory === memoryBefore + 1);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("discarded").instanceId]);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("watches ANY of your Lucemon: a battle-area source reacts to a different stack's move", async () => {
    // The printed subject is "any of your Digimon with [Lucemon] in their names", not "this
    // Digimon", so a Cupimon sitting under an unrelated battle-area Digimon must still react
    // to a Lucemon moving out of breeding.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] }],
          breeding: { card: "BT4-115", as: "lucemon" },
          hand: [{ card: "BT1-009", as: "discarded" }, "BT1-011"],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("discarded").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === memoryBefore + 1);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("discarded").instanceId]);
    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("cupimon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("fires once per source: two Cupimon in the same stack each grant a draw and a memory", async () => {
    // [Once Per Turn] is scoped to the effect's own source card, so two copies under the same
    // Lucemon resolve independently — two hand trashes, two draws, two memory.
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: "BT4-115",
            as: "lucemon",
            under: [
              { card: "EX10-004", as: "cupimonA" },
              { card: "EX10-004", as: "cupimonB" },
            ],
          },
          hand: ["BT1-009", "BT1-011"],
          deck: [
            { card: "BT1-010", as: "drawnA" },
            { card: "BT1-012", as: "drawnB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === memoryBefore + 2);

    expect(s.state.memory).toBe(memoryBefore + 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot move a lone Cupimon out of breeding, so nothing triggers", async () => {
    // §4-16-2: only a Digimon WITH DP may move. A Digi-Egg on its own has 0 DP, so the intent
    // is rejected and the inherited effect never has a subject.
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-004", as: "cupimon" },
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("cupimon").permanentId })).toEqual({
      ok: false,
      reason: "not-movable",
    });
    await settle(() => false, 60);

    expect(s.state.players[0]!.breeding).toBeDefined();
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("grants nothing when the OPPONENT moves a Lucemon out of breeding", async () => {
    // [Your Turn] plus the `controller: "mine"` subject filter. Both gates are exercised at
    // once: an own-Digimon move on the opponent's turn is unreachable, because a seat may only
    // take its breeding action on its own turn.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
        1: {
          breeding: { card: "BT4-115", as: "theirLucemon" },
          hand: ["BT1-011"],
          deck: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("theirLucemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore);
  });
  it("refuses the second grant in the same turn: two Lucemon leave breeding through public intents", async () => {
    // NATURAL-ORIGIN once-per-turn proof. Two breeding-to-battle moves in ONE turn are legal
    // even though a seat takes at most one breeding ACTION (§6-4): the second move is an
    // effect move (EX10-013's "[Breeding] [When Digivolving] This Digimon may move"), which
    // `movePermanentZone` fires `whenMovedFromBreeding` for exactly like the player verb, and
    // P-123 Ukkomon refills the emptied breeding area with an effect hatch off the first move.
    // The single EX10-004 source sits under a battle-area host, so it watches BOTH moves.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] },
            { card: "P-123", as: "ukkomon" },
          ],
          breeding: { card: "EX10-013", as: "lucemonA" },
          eggDeck: [{ card: "BT1-006", as: "hatched" }],
          hand: [
            { card: "BT1-009", as: "fodder1" },
            { card: "BT1-012", as: "fodder2" },
            { card: "EX10-013", as: "lucemonB" },
          ],
          deck: [
            { card: "BT1-010", as: "drawn1" },
            { card: "BT1-014", as: "drawn2" },
            { card: "BT1-009", as: "drawn3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("fodder1").instanceId, s.inst("fodder2").instanceId);
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    // Move 1 — the breeding-phase verb. Cupimon pays the trash, draws and gains memory;
    // Ukkomon hatches BT1-006 into the freed breeding slot (its inherited text is
    // [When Attacking] only, so the new stack adds no competing EX10-004 source).
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemonA").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("hatched").instanceId &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn1").instanceId),
    );
    await settle(() => false, 30);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder1").instanceId]);
    const memoryAfterFirst = s.state.memory;
    expect(memoryAfterFirst).toBeGreaterThan(memoryBefore);
    const handAfterFirst = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    // Move 2 — same turn, no breeding action left: digivolve the hatched Cupimon in breeding
    // into a second EX10-013, whose [When Digivolving] move carries it to the battle area.
    // Digivolving is a Main-phase verb; this hand-laid board never ran the turn loop. Memory is
    // raised to a known value so the only movement left to measure is EX10-013's digivolution
    // cost of 5 — a second memory grant from this clause would show as -3 instead of 3.
    s.state.phase = Phase.Main;
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("lucemonB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.breeding === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("lucemonB").instanceId),
    );
    await settle(() => false, 30);

    // The second move really happened...
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("lucemonB").instanceId),
    ).toBe(true);
    // ... and the [Once Per Turn] gate refused it: no second trash, no second draw, no memory.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder1").instanceId]);
    // Exactly one card left the deck for the digivolution draw (§6-2-2, which applies in the
    // breeding area too) and none for a second ＜Draw 1＞ from this clause.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn3").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [...handAfterFirst.filter((id) => id !== s.inst("lucemonB").instanceId), s.inst("drawn2").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("fodder2").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets on the next own turn: a move on turn 1 and a move on turn 3 both grant", async () => {
    // Once-per-turn reset through the REAL turn loop. Turn 1 uses the breeding-phase move
    // verb; turn 3 hatches (the turn's breeding action) and moves the fresh Lucemon by
    // EX10-013's [When Digivolving] effect. Each firing trashes exactly one hand card, so the
    // trash is the signal that survives the loop's own draws.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: "EX10-004", as: "cupimon" }] }],
          breeding: { card: "EX10-013", as: "lucemonT1" },
          eggDeck: [{ card: "BT1-006", as: "hatched" }],
          hand: [
            { card: "BT1-009", as: "fodder1" },
            { card: "BT1-012", as: "fodder2" },
            { card: "EX10-013", as: "lucemonT3" },
          ],
          deck: ["BT1-010", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-010"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-010"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("fodder1").instanceId, s.inst("fodder2").instanceId);

    const loop = s.engine.startTurnLoop();
    const p0 = s.state.players[0]!;

    // Turn 1: the breeding permanent parks the loop in the Breeding phase.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemonT1").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => p0.trash.length === 1);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder1").instanceId]);
    expect(p0.hand.some(({ instanceId }) => instanceId === s.inst("fodder1").instanceId)).toBe(false);

    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Turn 2: the opponent's turn passes untouched.
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    expect(p0.trash).toHaveLength(1);

    // Turn 3: hatch (this turn's breeding action), then digivolve in breeding so the fresh
    // Lucemon moves by effect. The gate has reset, so the clause pays and grants again.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => p0.breeding?.topCard?.instanceId === s.inst("hatched").instanceId);
    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(0, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);

    const handBeforeSecond = p0.hand.length;
    const deckBeforeSecond = p0.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: p0.breeding!.permanentId,
        instanceId: s.inst("lucemonT3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.length === 2);
    await settle(() => false, 30);

    expect(p0.breeding).toBeUndefined();
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("lucemonT3").instanceId)).toBe(true);
    expect(p0.trash.some(({ instanceId }) => instanceId === s.inst("fodder2").instanceId)).toBe(true);
    // The digivolve card and the trashed card both left the hand, and the paid draw arrived.
    expect(p0.hand.some(({ instanceId }) => instanceId === s.inst("lucemonT3").instanceId)).toBe(false);
    expect(p0.hand.some(({ instanceId }) => instanceId === s.inst("fodder2").instanceId)).toBe(false);
    // Two cards left the deck: the digivolution draw (§6-2-2) and this clause's paid ＜Draw 1＞.
    expect(p0.deck).toHaveLength(deckBeforeSecond - 2);
    // Net zero: the digivolve card and the trashed card left, the digivolution draw and this
    // clause's paid ＜Draw 1＞ arrived.
    expect(p0.hand).toHaveLength(handBeforeSecond);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
