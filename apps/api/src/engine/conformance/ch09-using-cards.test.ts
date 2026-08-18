import { describe, it, expect } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, CardInstance, Phase, PendingDecision, type Seat } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import {
  validatePlayCard,
  applyPlayCard,
  defaultPlayCardDeps,
  type PlayCardDeps,
} from "../actions/playCard.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 9 "Using Cards" (comprehensive-0136..0138).
 *
 * comprehensive-0136 (bare chapter heading) is already seeded in `not-testable.ts` by an
 * earlier lane; not repeated here. See README.md for the citation contract.
 */

// Real fixtures from the generated card table, reused throughout this file:
//   BT1-090  — Option, playCost 0
//   BT1-091  — Option, playCost 3

let seq = 0;
function optionInstance(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const ci = new CardInstance();
  ci.instanceId = `opt-${seq}`;
  ci.cardId = cardId;
  ci.ownerSeat = seat;
  ci.faceUp = false;
  return ci;
}

function optionState(handCardId: string): { state: GameState; card: CardInstance } {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.memory = 0;
  const card = optionInstance(handCardId, 0);
  const p0 = new PlayerState();
  p0.seat = 0;
  p0.hand = new ArraySchema<CardInstance>(card);
  const p1 = new PlayerState();
  p1.seat = 1;
  state.players = new ArraySchema<PlayerState>(p0, p1);
  return { state, card };
}

describe("§9-1 Using Cards (comprehensive-0137)", () => {
  it("9-1-1: using an Option is gated by its color requirement, exactly like playing a Digimon", () => {
    cite(
      "comprehensive-0137",
      "9-1-1 using a card refers to activating an Option card's [Main] effect; its color " +
        "requirements must be met",
    );

    const { state, card } = optionState("BT1-090"); // playCost 0, so cost never blocks the play
    const deps: Pick<PlayCardDeps, "maxAffordable" | "adjustedPlayCost" | "playProhibited" | "colorRequirementMet"> = {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      colorRequirementMet: () => false, // an unmet, unwaived color requirement
    };
    const check = validatePlayCard(state, 0, { type: "playCard", instanceId: card.instanceId }, deps);
    expect(check).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("9-1-4: a used Option is treated as 'in no area' while its [Main] effect resolves", async () => {
    cite(
      "comprehensive-0137",
      "9-1-4 a used Option card is treated as not being in any area during the period " +
        "from activation of its 1st [Main] effect until it's been resolved",
    );

    const { state, card } = optionState("BT1-090");
    let cardWasInTrashDuringResolution: boolean | undefined;
    const deps: PlayCardDeps = {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      payMemory: defaultPlayCardDeps.payMemory,
      nextPermanentId: () => "perm-x",
      fireTiming: async (s, seat, _timing, sourceInstanceId) => {
        // Observe the trash zone AT THE MOMENT the option's own [Main] effect fires — this is
        // squarely inside "the period from activation... until it's been resolved" (9-1-4).
        cardWasInTrashDuringResolution = s.players[seat]!.trash.some((c) => c.instanceId === sourceInstanceId);
      },
    };
    const outcome = await applyPlayCard(state, 0 as Seat, { type: "playCard", instanceId: card.instanceId }, deps);
    expect(outcome).toEqual({
      ok: true,
      outcome: { cardId: "BT1-090", instanceId: card.instanceId, mode: "option", cost: 0 },
    });

    // The card is held on PlayerState.resolvingOption (a non-zone slot) for the duration of its
    // own [Main] effect, so no zone array — trash included — reports it as a member yet.
    expect(cardWasInTrashDuringResolution).toBe(false);
    // ...and it lands in trash once resolution completes, same as before.
    expect(state.players[0]!.trash.some((c) => c.instanceId === card.instanceId)).toBe(true);
    expect(state.players[0]!.resolvingOption).toBeUndefined();
  });

  it("9-1-4: an Option whose [Main] effect throws still ends up in trash with resolvingOption cleared", async () => {
    const { state, card } = optionState("BT1-090");
    const deps: PlayCardDeps = {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      payMemory: defaultPlayCardDeps.payMemory,
      nextPermanentId: () => "perm-x",
      fireTiming: async () => {
        throw new Error("effect blew up mid-resolution");
      },
    };
    await expect(
      applyPlayCard(state, 0 as Seat, { type: "playCard", instanceId: card.instanceId }, deps),
    ).rejects.toThrow("effect blew up mid-resolution");

    // The error path must not strand the card outside every zone: it still lands in trash and
    // the transient slot is cleared, even though the effect never completed normally.
    expect(state.players[0]!.trash.some((c) => c.instanceId === card.instanceId)).toBe(true);
    expect(state.players[0]!.resolvingOption).toBeUndefined();
  });

  it("9-1-5: a used Option (no ＜Delay＞) is trashed as pending processing once its [Main] effect resolves", async () => {
    cite(
      "comprehensive-0137",
      "9-1-5 a used Option card is immediately trashed as pending processing as soon as " +
        "its 1st [Main] effect has resolved, unless it is considered to be placed in an area",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    p0.battleArea.push(digimon(0, 3000, "BT1-009")); // §4-21 color-requirement source (Red)
    const card = instance("BT1-090", 0, false);
    p0.hand.push(card);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    await settle(() => p0.trash.some((c) => c.instanceId === card.instanceId), 200);
    expect(p0.hand.some((c) => c.instanceId === card.instanceId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === card.instanceId)).toBe(true);
  });
});

describe("§9-1-6 Using Cards (comprehensive-0138)", () => {
  it("9-1-7: cards are used 1 at a time — a second use is rejected while one is mid-resolution", () => {
    cite(
      "comprehensive-0138",
      "9-1-7 cards are used 1 at a time; multiple cards can't be used at the same time",
    );

    const { state, card } = optionState("BT1-090");
    const pd = new PendingDecision();
    pd.decisionId = "d1";
    pd.seat = 0;
    pd.kind = "optional";
    state.pendingDecision = pd;

    const deps: Pick<PlayCardDeps, "maxAffordable" | "adjustedPlayCost" | "playProhibited" | "colorRequirementMet"> = {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
    };
    const check = validatePlayCard(state, 0, { type: "playCard", instanceId: card.instanceId }, deps);
    expect(check).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("9-1-8: an unaffordable Option use returns the card unchanged and doesn't move memory", async () => {
    cite(
      "comprehensive-0138",
      "9-1-8 if a card can no longer be used after reveal, it's returned unchanged; " +
        "memory doesn't move when it fails on cost",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    p0.battleArea.push(digimon(0, 3000, "BT1-009")); // §4-21 color-requirement source (Red)
    const card = instance("BT1-091", 0, false); // playCost 3
    p0.hand.push(card);
    s.state.memory = -10; // maxAffordable(0) = 0 < 3
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(p0.hand.some((c) => c.instanceId === card.instanceId)).toBe(true);
  });

  it("9-1-9-2/9-1-9-3: the use cost is paid BEFORE the [Main] effect activates", async () => {
    cite(
      "comprehensive-0138",
      "9-1-9-2 the specified use cost is paid; 9-1-9-3 THEN, once use is resolved, the " +
        "1st [Main] effect is activated",
    );

    const { state, card } = optionState("BT1-091"); // playCost 3
    const order: string[] = [];
    const deps: PlayCardDeps = {
      maxAffordable: defaultPlayCardDeps.maxAffordable,
      payMemory: (s, seat, cost) => {
        order.push("payMemory");
        defaultPlayCardDeps.payMemory(s, seat, cost);
      },
      nextPermanentId: () => "perm-x",
      fireTiming: async () => {
        order.push("fireTiming");
      },
    };
    const outcome = await applyPlayCard(state, 0 as Seat, { type: "playCard", instanceId: card.instanceId }, deps);
    expect(outcome.ok).toBe(true);
    expect(order).toEqual(["payMemory", "fireTiming"]);
  });
});
