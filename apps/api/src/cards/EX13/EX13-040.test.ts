import { EffectTiming, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
// EX13/index.ts is coordinator-owned and does not list this module yet, so the test registers it.
import { compiled } from "./EX13-040.js";

const CARD_ID = "EX13-040";
/** Green Lv.3, 3000 DP, no printed text: the legal (and only) evolution base. */
const GREEN_BASE = "BT1-064";
/** Red Lv.3, no printed text: the wrong-color negative for the green Lv.3 requirement. */
const RED_BASE = "BT1-009";
/** Inert red Lv.3 / Lv.4 fillers used as neutral opponent or ally permanents. */
const FILLER_A = "BT1-013";
const FILLER_B = "BT1-014";
/** An opponent Tamer whose own effect only fires on ITS controller's turn for red attackers. */
const OPPONENT_TAMER = "BT2-084";

type Harness = ReturnType<typeof setupEngine>;

async function chooseTarget(s: Harness, permanentId: string): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const decision = s.state.pendingDecision!;
  const seat = s.decisions.at(-1)!.seat;
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [permanentId] },
    }),
  ).toEqual({ ok: true });
}

describe("EX13-040 Mikemon", () => {
  it("compiles both lock windows, the self-suspend watcher and the inherited suspended aura", () => {
    const card = runtimeCompiledCard(CARD_ID);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    const lock = {
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
    };
    expect(card?.effects).toMatchObject([
      { trigger: "OnPlay", actions: [lock] },
      { trigger: "WhenDigivolving", actions: [lock] },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { isSelfRef: true },
            actions: [
              { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
            ],
          },
        ],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            effect: { kind: "modifyDP", amount: 1000 },
            target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], suspended: true } },
          },
        ],
      },
    ]);
    // Neither printed main clause is inherited, and no clause carries [Once Per Turn].
    expect(card?.effects.filter((effect) => effect.isInherited === true)).toHaveLength(1);
    expect(card?.effects.some((effect) => effect.frequency !== undefined)).toBe(false);
    // No [Digivolve] line is printed, so the only route is the catalog evoCost.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(digivolutionRequirementsFor(CARD_ID)).toBeUndefined();
    expect(getCardDefinition(CARD_ID)?.evoCosts).toEqual([{ color: "Green", level: 3, memoryCost: 2 }]);
  });

  it("locks one opponent Digimon on play, through a real opponent unsuspend phase, and lapses at their turn end", async () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "source" }, FILLER_A] },
      1: {
        battleArea: [
          { card: FILLER_A, as: "locked", suspended: true },
          { card: FILLER_B, as: "free", suspended: true },
        ],
        security: [FILLER_A],
      },
    });
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await chooseTarget(s, s.perm("locked").permanentId);
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "unsuspend"));

    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("free"), "unsuspend")).toBe(false);
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(s.perm("free").isSuspended).toBe(true);

    // "until THEIR turn ends", not "for the turn": my own turn ending must not release the lock.
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 0);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);

    // The opponent's own unsuspend phase must leave the locked permanent suspended and free the other.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    expect(s.perm("locked").isSuspended).toBe(true);
    expect(s.perm("free").isSuspended).toBe(false);
    // "until their turn ends": the lock is gone once that turn is over.
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("locked").permanentId]);
    expect(s.perm("locked").isSuspended).toBe(false);
  });

  it("locks an opponent Tamer as readily as a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "source" }] },
      1: {
        battleArea: [
          { card: OPPONENT_TAMER, as: "tamer", suspended: true },
          { card: FILLER_A, as: "digimon" },
        ],
      },
    });

    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await chooseTarget(s, s.perm("tamer").permanentId);
    await resolution;
    await settle(() => observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend"));

    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("digivolves from a green Lv.3 for 2 memory with one bonus draw and fires the lock", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: GREEN_BASE, as: "base" }],
        hand: [{ card: CARD_ID, as: "mikemon" }],
        deck: [FILLER_A, FILLER_B],
      },
      1: {
        battleArea: [
          { card: FILLER_A, as: "locked", suspended: true },
          { card: FILLER_B, as: "free", suspended: true },
        ],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mikemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await chooseTarget(s, s.perm("locked").permanentId);
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "unsuspend"));

    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([GREEN_BASE]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([FILLER_A]);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("free"), "unsuspend")).toBe(false);
  });

  it("refuses a red Lv.3 base: the printed green Lv.3 requirement is the only route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: RED_BASE, as: "base" }], hand: [{ card: CARD_ID, as: "mikemon" }], deck: [FILLER_A] },
      1: { battleArea: [{ card: FILLER_A, as: "bystander", suspended: true }] },
    });
    s.state.memory = 8;

    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("mikemon").instanceId,
          useAlternateCost,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
    }
    expect(s.perm("base").topCard.cardId).toBe(RED_BASE);
    expect(s.state.memory).toBe(8);
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "unsuspend")).toBe(false);
  });

  it("suspends one opponent permanent when an effect suspends this Digimon, every time", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "source" }] },
      1: {
        battleArea: [
          { card: FILLER_A, as: "first" },
          { card: FILLER_B, as: "second" },
        ],
      },
    });

    const firstSuspend = advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await chooseTarget(s, s.perm("first").permanentId);
    await firstSuspend;
    await settle(() => s.perm("first").isSuspended);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);

    // No [Once Per Turn] is printed: a second same-turn suspension of the host fires again.
    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    const secondSuspend = advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await chooseTarget(s, s.perm("second").permanentId);
    await secondSuspend;
    await settle(() => s.perm("second").isSuspended);

    expect(s.perm("second").isSuspended).toBe(true);
  });

  it("fires the watcher on the attack declaration's own suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        // 2000 DP security so the 5000 DP host survives the check and stays on the board.
        1: { battleArea: [{ card: OPPONENT_TAMER, as: "tamer" }], security: ["BT1-012"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("ignores another permanent suspending: the watcher is scoped to its own host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "source" },
          { card: FILLER_A, as: "ally" },
        ],
      },
      1: { battleArea: [{ card: FILLER_B, as: "opponent" }] },
    });

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.perm("ally").isSuspended);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gives the inherited +1000 DP to every suspended Digimon you control, tracking orientation live", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: FILLER_B, as: "host", dp: 4000, under: [CARD_ID] },
          { card: FILLER_A, as: "suspendedAlly", dp: 5000, suspended: true },
          { card: FILLER_A, as: "standingAlly", dp: 5000 },
        ],
      },
      1: { battleArea: [{ card: FILLER_A, as: "opponent", dp: 5000, suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.perm("suspendedAlly").currentDP).toBe(6000);
    expect(s.perm("standingAlly").currentDP).toBe(5000);
    // "All of your suspended Digimon" has no "other": a suspended host is boosted too.
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("opponent").currentDP).toBe(5000);

    await advance(s.engine).verb.suspend([s.perm("standingAlly").permanentId, s.perm("host").permanentId]);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("standingAlly").currentDP).toBe(6000);
    expect(s.perm("host").currentDP).toBe(5000);

    await advance(s.engine).verb.unsuspend([s.perm("suspendedAlly").permanentId]);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("suspendedAlly").currentDP).toBe(5000);
    expect(s.perm("standingAlly").currentDP).toBe(6000);
  });

  it("does not project the suspended aura from the top card: the clause is inherited only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "source", suspended: true },
          { card: FILLER_A, as: "ally", dp: 5000, suspended: true },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").currentDP).toBe(5000);
    expect(s.perm("ally").currentDP).toBe(5000);
  });
});
