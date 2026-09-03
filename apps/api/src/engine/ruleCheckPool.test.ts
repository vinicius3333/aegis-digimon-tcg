import { describe, it, expect } from "vitest";
import type { PlayerState, ServerEvent } from "@aegis/shared";
import { evaluateCondition } from "./effects/interpreter/conditions.js";
import { mergeRuleDeletions } from "./GameEngine.js";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
// Boot side-effect: self-registers every compiled-IR card module.
import "../cards/index.js";

/**
 * One rule check produces ONE simultaneous trigger group (Comprehensive Rules §17-1-3,
 * §15-4-3-3, §15-4-3-5).
 *
 * §17-1-3 declares rule-check processing simultaneous, and §15-4-3-3 says the effects a rule
 * check triggers trigger simultaneously with the other effects at that timing. The engine
 * still has to WALK its sweeps one at a time, so the observable consequence is what these
 * tests pin: whatever sweep removed a card, every resulting [On Deletion] effect reaches the
 * player in one activation-order prompt (§15-4-3-4), turn player's group first (§15-4-3-5).
 * Per-sweep windows would instead resolve sweep #2's trigger before sweep #3 even ran, and
 * would never prompt at all when each sweep contributes a single trigger.
 *
 * Q2356 / Q909 / Q910 cover the same rule from the other side: several Digimon deleted by one
 * rule check are deleted at the same time, and effects counting deletions see one event.
 *
 * The sweep is private and only reachable through the real fixpoint, so each test opens a
 * timing window by playing a cheap, effect-free vanilla Digimon (BT1-009) — the assertions
 * are entirely about the pre-seeded illegal board.
 */

const TRIGGER_CARD = "BT1-009"; // vanilla Lv.3, cost 2, no effectText — pure timing-window opener.
const TRIGGER_COST = 2;
/** BT1-035 Leomon: "[On Deletion] Gain 2 memory." — one printed, mandatory, observable trigger. */
const ON_DELETION_CARD = "BT1-035";

async function triggerSweep(s: EngineSetup): Promise<void> {
  s.state.memory = TRIGGER_COST;
  const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId });
  expect(result).toEqual({ ok: true });
  await settle();
}

function orderPrompts(s: EngineSetup): { seat: number; keys: string[] }[] {
  return s.decisions
    .filter(({ req }) => req.kind === "orderTriggers")
    .map(({ seat, req }) => ({ seat, keys: [...(req.options?.triggerKeys ?? [])] }));
}

function resolvedSeats(events: readonly ServerEvent[], cardId: string): number[] {
  return events
    .filter((event): event is ServerEvent & { kind: "effectResolved"; seat: number; sourceCardId: string } =>
      Boolean(event.kind === "effectResolved" && "sourceCardId" in event && event.sourceCardId === cardId),
    )
    .map((event) => event.seat);
}

describe("rule-check trigger pool — one group per pass (CR §17-1-3, §15-4-3-3)", () => {
  it("preserves sweep provenance order when identifying the first deleted permanent", () => {
    const firstSnapshot = { permanentId: "first" };
    const secondSnapshot = { permanentId: "second" };
    const merged = mergeRuleDeletions([
      {
        trigger: {
          deletedPermanentId: "first",
          deletedPermanentIds: ["first"],
          deletedPermanentSnapshots: [firstSnapshot],
        },
        ascensionCandidates: [],
        transientCandidates: [],
      },
      {
        trigger: {
          deletedPermanentId: "second",
          deletedPermanentIds: ["second"],
          deletedPermanentSnapshots: [secondSnapshot],
        },
        ascensionCandidates: [],
        transientCandidates: [],
      },
    ] as never);

    expect(merged.trigger.deletedPermanentIds).toEqual(["first", "second"]);
    expect(merged.trigger.deletedPermanentSnapshots).toEqual([firstSnapshot, secondSnapshot]);
    const condition = { kind: "triggerIsFirstDeletedPermanent" } as const;
    const context = {
      game: { opponentOf: (seat: number) => (seat === 0 ? 1 : 0) },
      source: { ownerSeat: 0, permanent: () => undefined },
    };
    expect(
      evaluateCondition(
        { ...context, trigger: { ...merged.trigger, deletedPermanentId: "first" } } as never,
        condition,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { ...context, trigger: { ...merged.trigger, deletedPermanentId: "second" } } as never,
        condition,
      ),
    ).toBe(false);
  });

  it("two DIFFERENT sweeps of one pass put their [On Deletion] effects in ONE ordering prompt", async () => {
    // Two separate §17-1-3 conditions, deliberately handled by two different sweeps of the
    // same pass: raw DP below 0 (§17-1-3-2-1) and raw DP exactly 0 (§17-1-3-1-1). Both cards
    // belong to the turn player, so both triggers land in the same controller's group and the
    // engine must ask that player which to activate first (§15-4-3-4).
    const s = setupEngine({
      0: {
        hand: [{ card: TRIGGER_CARD, as: "trigger" }],
        battleArea: [
          { card: ON_DELETION_CARD, dp: -1000, as: "belowZero" },
          { card: ON_DELETION_CARD, dp: 0, as: "atZero" },
        ],
      },
    });
    const belowZeroId = s.perm("belowZero").topCard!.instanceId;
    const atZeroId = s.perm("atZero").topCard!.instanceId;

    await triggerSweep(s);

    const prompts = orderPrompts(s);
    expect(prompts.length).toBe(1);
    expect(prompts[0]?.seat).toBe(0);
    expect(prompts[0]?.keys.length).toBe(2);
    // One prompt covering BOTH deletions, whichever sweep removed each card.
    expect(prompts[0]?.keys.some((key) => key.startsWith(`${belowZeroId}::`))).toBe(true);
    expect(prompts[0]?.keys.some((key) => key.startsWith(`${atZeroId}::`))).toBe(true);
  });

  it("the turn player's trigger activates first even when the OPPONENT's card was removed by an earlier sweep", async () => {
    // The opponent's Digimon is removed by the FIRST sweep of the pass (raw DP below 0) and
    // the turn player's by a LATER one (raw DP exactly 0). Sweep order must not decide
    // activation order: §15-4-3-5 gives the turn player's group priority, whole and first.
    const s = setupEngine({
      0: {
        hand: [{ card: TRIGGER_CARD, as: "trigger" }],
        battleArea: [{ card: ON_DELETION_CARD, dp: 0, as: "mine" }],
      },
      1: { battleArea: [{ card: ON_DELETION_CARD, dp: -1000, as: "theirs" }] },
    });

    await triggerSweep(s);

    // Each player holds exactly one of these triggers, so neither is prompted for an order;
    // the sequence of resolutions is the whole assertion.
    expect(resolvedSeats(s.events, ON_DELETION_CARD)).toEqual([0, 1]);
  });

  it("negative control: a lone rule-check deletion resolves without an ordering prompt", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: TRIGGER_CARD, as: "trigger" }],
        battleArea: [{ card: ON_DELETION_CARD, dp: 0, as: "mine" }],
      },
    });
    const p0 = s.state.players[0] as PlayerState;
    const deletedId = s.perm("mine").topCard!.instanceId;

    await triggerSweep(s);

    expect(orderPrompts(s)).toEqual([]);
    expect(p0.trash.some((card) => card.instanceId === deletedId)).toBe(true);
    expect(resolvedSeats(s.events, ON_DELETION_CARD)).toEqual([0]);
  });

  it("retains a deleted Token source until its pooled [On Deletion] effect resolves", async () => {
    const s = setupEngine({
      0: { hand: [{ card: TRIGGER_CARD, as: "trigger" }] },
      1: {
        battleArea: [{ card: "TOKEN-Petrification-Token", dp: 0, as: "token" }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    const tokenPermanentId = s.perm("token").permanentId;

    await triggerSweep(s);

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === tokenPermanentId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(resolvedSeats(s.events, "TOKEN-Petrification-Token")).toEqual([1]);
  });
});
