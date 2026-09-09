import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// Fixture vocabulary (BT19-089 Red Card — Red Option, cost 2).
// BT1-013 Muchomon: inert Red Lv.3 5000 DP main-deck Digimon — the grant recipient. Its
//   printed 5000 DP is the Q3158 worked example's starting DP.
// BT1-009 Monodramon: inert Red Lv.3 3000 DP — deck/security padding and the untargeted
//   PEER that must still take everything the protected Digimon shrugs off.
// BT2-097 Sky Crevasse: Yellow Option, cost 3 — "[Main] 3 of your opponent's level 3
//   Digimon get -4000 DP for the turn", and "[Security] Activate this card's [Main]
//   effect". The opponent-Option lever for BOTH printed protections at once, and the
//   Q3158 pre-existing reduction when it flips out of a security check.
// BT5-035 Starmons: Yellow Lv.3 Digimon, cost 3 — "[On Play] For each Digimon you have in
//   play, 1 of your opponent's Digimon gets -1000 DP for the turn". A DP reduction from a
//   NON-Option source. The printed clause qualifies only the "isn't affected" half with
//   "your opponent's Option cards"; the DP half is unqualified, so this must be refused
//   too. Cost 3 matters: a cost-5 card would drive the opponent's memory negative, hand
//   the turn straight back and expire the "for the turn" reduction before it can be read.
// BT1-055 Kyubimon: Yellow Lv.4 Digimon whose only clause is [On Play] — the opponent's
//   inert yellow colour anchor for BT2-097.
// EX2-047 ADR-03 Pendulum Feet: mono-White Digimon whose only clause is [On Play] — inert
//   once seeded. The colour-waiver enabler.
// BT12-098 Watchmaker: mono-White Tamer, [On Play] only — the Tamer half of the waiver.
// BT10-008 Shoutmon: inert-on-board Red Lv.3 — the non-white opponent near-miss.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

const dpOf = (s: EngineSetup, alias: string): number => s.perm(alias).currentDP;

describe("BT19-089 Red Card — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-089")).toMatchObject({
      cardId: "BT19-089",
      nameEn: "Red Card",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
      securityEffectText: "[Security] Add this card to the hand.",
    });
    // Catalog discrepancy (reported, not edited): the record runs the colour-waiver
    // sentence and the [Main] clause together with a DOUBLE space instead of a newline.
    expect(getCardDefinition("BT19-089")!.effectText).toBe(
      "While your opponent has a white Digimon or Tamer, you may ignore this card's color requirements.  " +
        "[Main] Until the end of your opponent's turn, 1 of your Digimon isn't affected by the effects of " +
        "your opponent's Option cards and it can't have its DP reduced.",
    );
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-089");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            // "your opponent has a white Digimon or Tamer" — an opponent-side count over
            // Digimon AND Tamer, not a self-side one.
            condition: {
              kind: "opponentHas",
              filter: { controllerDefault: "opponent", colors: ["White"], kind: ["Digimon", "Tamer"] },
            },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Restrict",
            restriction: "beAffected",
            // "the effects of your OPPONENT'S OPTION cards": qualified twice over.
            fromSourceKind: ["Option"],
            byOpponentEffectsOnly: true,
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
          },
          {
            kind: "Restrict",
            restriction: "dpImmune",
            duration: "untilOpponentTurnEnd",
            // "and IT can't have its DP reduced" — the same Digimon, and with no
            // "by your opponent's effects" qualifier (contrast BT11-069 / BT16-055,
            // which print it and therefore carry `byOpponentEffectsOnly`).
            target: { count: 1, sameTarget: true },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
    ]);
    expect(
      (card?.effects[1]?.actions[1] as { byOpponentEffectsOnly?: boolean } | undefined)?.byOpponentEffectsOnly,
    ).toBeUndefined();
  });
});

describe("BT19-089 Red Card — use cost and the colour waiver", () => {
  /** Seat 0 holds Red Card with a single non-red Digimon of its own; seat 1's board varies. */
  function colourFixture(opponentBoard: string[], ownBoard: string[] = ["BT1-055"]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: opponentBoard.map((card, index) => ({ card, as: `foe${index}` })),
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    return s;
  }

  it("refuses the play with no red permanent and no white opponent permanent", async () => {
    const s = colourFixture(["BT10-008"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-089");
  });

  it("still refuses when the WHITE permanent is the caster's own (the condition is opponent-side)", async () => {
    const s = colourFixture(["BT10-008"], ["BT1-055", "EX2-047"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the colour requirement while the opponent has a white DIGIMON, and charges the printed 2", async () => {
    const s = colourFixture(["EX2-047"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));
    // Cost 2 off a memory of 3, and the card is spent.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT19-089");
    expect(s.events.find((event) => event.kind === "actionRejected")).toBeUndefined();
  });

  it("waives the colour requirement while the opponent has a white TAMER", async () => {
    const s = colourFixture(["BT12-098"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));
    expect(s.state.memory).toBe(1);
  });

  it("needs no waiver at all once the caster has a red permanent", async () => {
    const s = colourFixture(["BT10-008"], ["BT1-013"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));
    expect(s.state.memory).toBe(1);
  });
});

describe("BT19-089 Red Card — [Main] protection into the opponent's turn", () => {
  /**
   * Seat 0 plays Red Card on `chosen`, ends its turn, and seat 1 uses `opponentCard` in
   * its own Main phase — the window the printed "until the end of your opponent's turn"
   * duration exists for. `peer` is the identical untargeted Digimon control.
   */
  async function protectThenOpponentPlays(
    opponentCard: string,
    protect = true,
  ): Promise<{ s: EngineSetup; loop: Promise<unknown> }> {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: [
            { card: "BT1-013", as: "chosen" },
            { card: "BT1-013", as: "peer" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: opponentCard, as: "weapon" }, "BT1-009"],
          // BT1-055 is the opponent's inert YELLOW colour anchor for a yellow play.
          battleArea: [{ card: "BT1-055", as: "anchor" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    // Bias every single-target choice onto `chosen`, leaving `peer` as the control — for
    // seat 0's grant and for seat 1's later effect alike.
    prefer.push(s.perm("chosen").topCard!.instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const grant = protect
      ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })
      : { ok: true };
    expect(grant).toEqual({ ok: true });
    await settle(
      () => !protect || s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId),
    );
    expect(dpOf(s, "chosen")).toBe(5000);
    expect(dpOf(s, "peer")).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("weapon").instanceId })).toEqual({
      ok: true,
    });
    // Not `settle(...)`: the milestone this flow needs is "the play AND its [On Play] are
    // finished", and every observable a predicate could name (the Option in the trash, the
    // Digimon on the board) is already true before the [On Play] body resolves. Drain the
    // queue instead, then read.
    await drainMicrotasks();
    return { s, loop };
  }

  it("shrugs off an opponent OPTION that would reduce DP, while the untargeted peer takes it", async () => {
    // BT2-097: "3 of your opponent's level 3 Digimon get -4000 DP for the turn" — no
    // choice, it hits every legal level-3 Digimon, so the only reason `chosen` can come
    // out unchanged is the printed protection.
    const { s, loop } = await protectThenOpponentPlays("BT2-097");
    expect(dpOf(s, "peer")).toBe(1000);
    expect(dpOf(s, "chosen")).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses a DP reduction from a non-Option opponent source too (the DP half is unqualified)", async () => {
    // BT1-055's [On Play] is a DIGIMON effect, so `fromSourceKind: ["Option"]` does not
    // cover it; only the unqualified `dpImmune` can.
    const { s, loop } = await protectThenOpponentPlays("BT5-035");
    expect(dpOf(s, "chosen")).toBe(5000);
    // The protection is applied where the modifier LANDS (`primitives.ts:773` drops a
    // negative delta on a `dpImmune` permanent), not at targeting: the opponent still
    // picks `chosen`, so the peer is untouched. Pairing the two reads is what shows the
    // -2000 was refused rather than merely aimed elsewhere.
    expect(dpOf(s, "peer")).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("CONTROL: the same non-Option reduction lands when Red Card is never played", async () => {
    // Same fixture, same biased choice, minus the [Main] grant: BT1-055's [On Play]
    // takes `chosen` from 5000 to 3000. This is what the test above is the absence of.
    const { s, loop } = await protectThenOpponentPlays("BT5-035", false);
    expect(dpOf(s, "chosen")).toBe(3000);
    expect(dpOf(s, "peer")).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * BT2-091 Fire Wall: Red Option, cost 3 — "[Main] Delete 1 of your opponent's Digimon
   * with 4000 DP or less". Nothing here reduces DP, so only the `beAffected` half (source
   * kind Option, opponent-controlled) can save `chosen`.
   */
  async function opponentDeletionRun(protect: boolean): Promise<{
    s: EngineSetup;
    loop: Promise<unknown>;
    chosenInstance: string;
    peerInstance: string;
  }> {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: [
            { card: "BT1-013", as: "chosen", dp: 4000 },
            { card: "BT1-013", as: "peer", dp: 4000 },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: "BT2-091", as: "weapon" }, "BT1-009"],
          // BT10-008 Shoutmon: the opponent's inert RED colour anchor for a red Option.
          battleArea: [{ card: "BT10-008", as: "anchor" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    prefer.push(s.perm("chosen").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const chosenInstance = s.perm("chosen").topCard!.instanceId;
    const peerInstance = s.perm("peer").topCard!.instanceId;

    const grant = protect
      ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })
      : { ok: true };
    expect(grant).toEqual({ ok: true });
    await settle(
      () => !protect || s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId),
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("weapon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    return { s, loop, chosenInstance, peerInstance };
  }

  it("blocks a NON-DP opponent Option effect: the chosen Digimon is not deleted", async () => {
    const { s, loop, chosenInstance, peerInstance } = await opponentDeletionRun(true);
    // Like the DP half, the protection bites where the effect LANDS, not at targeting: the
    // opponent still picks the protected Digimon, and the deletion is simply refused, so
    // BOTH Digimon survive. The control below is what makes that a proof.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId).sort()).toEqual(
      [chosenInstance, peerInstance].sort(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT2-091");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("CONTROL: the same Option deletes the chosen Digimon when Red Card is never played", async () => {
    const { s, loop, chosenInstance, peerInstance } = await opponentDeletionRun(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([peerInstance]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(chosenInstance);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("CONTROL: the opponent Option reduction lands on BOTH Digimon when Red Card is never played", async () => {
    const { s, loop } = await protectThenOpponentPlays("BT2-097", false);
    expect(dpOf(s, "chosen")).toBe(1000);
    expect(dpOf(s, "peer")).toBe(1000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-089 Red Card — Q3158: an existing DP reduction is undone", () => {
  it("restores a Digimon whose DP was already reduced this turn", async () => {
    const prefer: string[] = [];
    // Seat 1's security holds BT2-097, whose [Security] clause activates its [Main]
    // effect: seat 0's level-3 Digimon get -4000 for the turn. Seat 0 flips it with a
    // real attack, THEN plays Red Card on the shrunken Digimon — Q3158's scenario, with
    // the reduction already on the board when the grant resolves.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: [
            { card: "BT1-013", as: "chosen" },
            { card: "BT1-009", as: "attacker", dp: 20_000 },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          deck: [...FILLER],
          security: [{ card: "BT2-097", as: "crevasse" }, "BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    prefer.push(s.perm("chosen").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(dpOf(s, "chosen")).toBe(5000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => dpOf(s, "chosen") === 1000);

    // Q3158's premise: 5000 printed, -4000 applied, currently 1000.
    expect(dpOf(s, "chosen")).toBe(1000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));

    // Q3158: "its DP will no longer be reduced ... therefore its DP will become 5000".
    expect(dpOf(s, "chosen")).toBe(5000);
    // The attacker, equally level 3 and equally reduced, keeps its reduction: only the
    // one chosen Digimon is protected.
    expect(dpOf(s, "attacker")).toBe(16_000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.find((event) => event.kind === "actionRejected")).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-089 Red Card — [Security] add this card to the hand", () => {
  it("reaches the defender's hand out of a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 20_000 }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          deck: [...FILLER],
          security: [{ card: "BT19-089", as: "red" }, "BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("red").instanceId));

    // Added to the HAND, not trashed, and only that one card left security.
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("red").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain("BT19-089");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
