import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import { validateSealedRookie } from "#api/engine/actions/validateSealedRookie";
import "#api/cards/index";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";
import fixture from "#api/engine/scenarios/sealed-color-and-breeding.fixture";
import { validateHatchEgg, validateMoveFromBreeding } from "#api/engine/actions/breeding";

it.each(["hatch", "move"] as const)("rejects every immediate second action after ordinary %s", async (first) => {
  const s = setupScenario({
    ...fixture,
    board: {
      ...fixture.board,
      0: {
        ...fixture.board[0],
        eggDeck: ["EX2-007", "BT1-001"],
        breeding: first === "move" ? { card: "BT1-029", as: "raised" } : undefined,
      },
    },
  });
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.engine.breeding.isOpen);
    const memory = s.state.memory;
    const deck = s.state.players[0]!.deck.map((card) => card.instanceId);
    const hand = s.state.players[0]!.hand.map((card) => card.instanceId);
    const eggDeck = s.state.players[0]!.eggDeck.map((card) => card.instanceId);
    const battle = s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId);
    const firstIntent =
      first === "hatch"
        ? ({ type: "hatchEgg" } as const)
        : ({ type: "moveFromBreeding", permanentId: s.perm("raised").permanentId } as const);
    expect(s.engine.applyIntent(0, firstIntent)).toEqual({ ok: true });
    const permanent = first === "hatch" ? s.state.players[0]!.breeding! : s.perm("raised");
    const afterAction = s.state.toJSON();
    const events = [...s.events];
    expect(s.engine.breeding.isActionSpent).toBe(true);
    expect(s.state.phase).toBe(Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: false, reason: "wrong-phase" });
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: permanent.permanentId })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
    expect(s.engine.applyIntent(0, { type: "placeSealedRookie", instanceId: s.inst("rookie").instanceId })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
    expect(s.state.toJSON()).toEqual(afterAction);
    expect(s.events).toEqual(events);
    await advance(s.engine).waitForMainPhase(0);
    const player = s.state.players[0]!;
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.engine.breeding.isOpen).toBe(false);
    expect(player.breeding?.topCard.instanceId).toBe(first === "hatch" ? eggDeck[0] : undefined);
    expect(player.breeding?.inBreeding).toBe(first === "hatch" ? true : undefined);
    expect(player.eggDeck.map((card) => card.instanceId)).toEqual(first === "hatch" ? eggDeck.slice(1) : eggDeck);
    expect(player.battleArea.map((entry) => entry.permanentId)).toEqual(
      first === "move" ? [...battle, permanent.permanentId] : battle,
    );
    expect(player.hand.map((card) => card.instanceId)).toEqual(hand);
    expect(player.deck.map((card) => card.instanceId)).toEqual(deck);
    expect(s.state.memory).toBe(memory);
    expect(s.events.filter((event) => event.kind === "cardPlayed")).toEqual([]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it.each([
  ["hatch", false],
  ["move", false],
  ["hatch", true],
  ["move", true],
  ["place", false],
  ["place", true],
] as const)(
  "rejects %s without an active window (other seat open: %s) while retaining the pure validator",
  async (verb, otherSeatOpen) => {
    const s = setupScenario({
      ...fixture,
      board: {
        ...fixture.board,
        0: {
          ...fixture.board[0],
          eggDeck: ["BT1-001"],
          breeding: verb === "move" ? { card: "BT1-029", as: "raised" } : undefined,
        },
      },
    });
    s.state.phase = Phase.Breeding;
    s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
    let intent;
    let check;
    if (verb === "hatch") {
      intent = { type: "hatchEgg" } as const;
      check = validateHatchEgg(s.state, 0);
    } else if (verb === "move") {
      intent = { type: "moveFromBreeding", permanentId: s.perm("raised").permanentId } as const;
      check = validateMoveFromBreeding(s.state, 0, intent);
    } else {
      intent = { type: "placeSealedRookie", instanceId: s.inst("rookie").instanceId } as const;
      check = validateSealedRookie({ state: s.state, seat: 0, instanceId: intent.instanceId });
    }
    expect(check.ok).toBe(true);
    const window = otherSeatOpen ? s.engine.breeding.run(1, false) : undefined;
    try {
      const state = s.state.toJSON();
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: false, reason: "wrong-phase" });
      expect(s.state.toJSON()).toEqual(state);
      expect(s.events).toEqual([]);
    } finally {
      s.engine.breeding.abort();
      await window;
    }
  },
);
