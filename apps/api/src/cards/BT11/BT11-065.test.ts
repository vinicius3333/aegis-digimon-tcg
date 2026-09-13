import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-065.js";
import "./BT11-070.js";
import "./BT11-111.js";

// A3 for BT11-065 (Snatchmon) — the inherited Vemmon-return clause.
//
// "[All Turns][Once Per Turn] When [Vemmon] is placed from this Digimon's digivolution cards at the
// bottom of its owner's deck, unsuspend this Digimon and it gains <Blocker> ..." (documented behavior, an
// INHERITED effect). The engine had no onDigivolutionCardReturnToDeckBottom event, so the clause was
// modeled as an UNCONDITIONAL AllTurns unsuspend (wrong — free every turn). Now `returnToDeck`-bottom
// fires the event (anchored to the host whose stack lost the card), gated to the host's own watcher
// and the returned card's name.
//
// FAILS-WHEN-REVERTED: drop the event fire and the suspended host stays suspended on a Vemmon return.

const SNATCH = "BT11-065"; // inherited under the host
const VEMMON = "BT11-061"; // a [Vemmon] Lv.3
const NON_VEMMON = "BT1-009"; // any non-Vemmon card
const TOP = "BT1-009"; // the host's top Digimon (any)

describe("BT11-065 inherited: Vemmon returned from this Digimon's stack to deck bottom unsuspends it", () => {
  it("maps catalog facts and both printed effects to IR", () => {
    expect(getCardDefinition("BT11-065")).toMatchObject({
      cardId: "BT11-065",
      colors: ["Black"],
      level: 4,
      playCost: 6,
      dp: 6000,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "PlaceUnder", position: "bottom" },
          { kind: "Return", to: "hand" },
        ],
      },
      { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
    expect(compiled.effects[0]?.actions[1]).not.toHaveProperty("optional");
  });

  it("returning a [Vemmon] to the deck bottom unsuspends the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: TOP,
              dp: 4000,
              as: "host",
              suspended: true,
              under: [{ card: SNATCH }, { card: VEMMON, as: "stackCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).verb.returnToDeck([s.inst("stackCard").instanceId]); // to bottom (default)
    await settle(() => s.perm("host").isSuspended === false);

    // The inherited clause fired: the host is unsuspended, and the Vemmon is in the deck.
    expect(s.perm("host").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    const stackCardId = s.inst("stackCard").instanceId;
    expect((s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId)).toBe(true);
  });

  it("returning a NON-[Vemmon] stack card does NOT unsuspend (name gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: TOP,
              dp: 4000,
              as: "host",
              suspended: true,
              under: [{ card: SNATCH }, { card: NON_VEMMON, as: "stackCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const stackCardId = s.inst("stackCard").instanceId;

    await advance(s.engine).verb.returnToDeck([stackCardId]);
    await settle(() => (s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId));

    // The card moved, but the host stays suspended — the watcher gates on the [Vemmon] name.
    expect((s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId)).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("uses the inherited trigger once for a real redirect, suppresses the same-turn replacement return, and resets next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-111",
              as: "galactic",
              suspended: true,
              under: [
                ...Array.from({ length: 10 }, (_, index) => ({ card: VEMMON, as: `vemmon${index + 1}` })),
                { card: SNATCH, as: "snatch" },
                { card: "BT11-070", as: "destromon" },
              ],
            },
            { card: TOP, as: "spare" },
          ],
          deck: Array.from({ length: 8 }, () => NON_VEMMON),
          security: Array.from({ length: 4 }, () => NON_VEMMON),
        },
        1: {
          battleArea: [
            { card: NON_VEMMON, as: "attacker1", dp: 3000 },
            { card: "BT1-084", as: "attacker2" },
            { card: NON_VEMMON, as: "attacker3", dp: 3000 },
          ],
          deck: Array.from({ length: 8 }, () => NON_VEMMON),
          security: Array.from({ length: 4 }, () => NON_VEMMON),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const hostId = s.perm("galactic").permanentId;
    const firstReturnIds = ["vemmon1", "vemmon2"].map((alias) => s.inst(alias).instanceId);
    preferred.push(...firstReturnIds, hostId);
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    expect(s.perm("galactic").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("galactic"), "Blocker")).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map(({ instanceId }) => instanceId)).toEqual(firstReturnIds);

    const replacementReturnIds = ["vemmon3", "vemmon4", "vemmon5", "vemmon6"].map((alias) => s.inst(alias).instanceId);
    preferred.splice(0, preferred.length, ...replacementReturnIds);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    expect(s.perm("galactic").isSuspended).toBe(true);
    expect(s.perm("galactic").stack.filter(({ cardId }) => cardId === VEMMON)).toHaveLength(4);
    expect(s.state.players[0]!.deck.slice(-4).map(({ instanceId }) => instanceId)).toEqual(replacementReturnIds);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("galactic"), "Blocker")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    expect(s.perm("galactic").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const resetOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const resetReturnIds = ["vemmon7", "vemmon8"].map((alias) => s.inst(alias).instanceId);
    preferred.push(...resetReturnIds, hostId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker3").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    expect(s.perm("galactic").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.slice(-2).map(({ instanceId }) => instanceId)).toEqual(resetReturnIds);
    advance(s.engine).endMainPhaseIfOpen(1);
    await resetOpponentTurn;
  });
});

describe("BT11-065 when digivolving", () => {
  it("places up to 2 Vemmon under itself and recovers Fusionize after reaching 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: VEMMON, as: "base", under: [{ card: VEMMON, as: "preexisting" }] },
            { card: "BT1-010", as: "neighbor" },
          ],
          hand: [{ card: SNATCH, as: "snatch" }],
          trash: [
            { card: VEMMON, as: "trashVemmon1" },
            { card: VEMMON, as: "trashVemmon2" },
            { card: "BT11-105", as: "fusionize" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snatch").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-105"));

    expect(s.perm("base").stack.filter(({ cardId }) => cardId === VEMMON)).toHaveLength(4);
    expect(
      s
        .perm("base")
        .stack.slice(2)
        .map(({ instanceId }) => instanceId),
    ).toEqual([s.inst("preexisting").instanceId, s.inst("base").instanceId]);
    expect(s.perm("neighbor").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT11-105");
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
