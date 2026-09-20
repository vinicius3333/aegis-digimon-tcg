import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import { nextInstanceId, nextPermanentId } from "./gameEngine/ruleProcess.js";
import { makeRng } from "./setup.js";

function engine(): GameEngine {
  const state = new GameState();
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const hooks: GameEngineHooks = { seed: 1, emit: () => undefined, requestDecision: () => undefined };
  return new GameEngine(state, hooks);
}

describe("GameEngine continuity primitives", () => {
  it("round-trips allocators and both random streams through JSON", () => {
    const source = engine();
    const sourceRngs = [makeRng(101), makeRng(202)] as const;
    source.rngForSeat = (seat: Seat) => sourceRngs[seat];
    source.permanentSeq = 12;
    source.instanceSeq = 18;
    source.windowTokenSeq = 9;
    source.rngForSeat(0)();
    source.rngForSeat(1)();
    source.rngForSeat(1)();

    const restored = engine();
    restored.restoreContinuityState(JSON.parse(JSON.stringify(source.exportContinuityState())));

    expect(nextPermanentId(restored)).toBe("perm-13");
    expect(nextInstanceId(restored)).toBe("inst-19");
    expect(restored.windowTokenSeq).toBe(9);
    for (const seat of [0, 1] as const) expect(restored.rngForSeat!(seat)()).toBe(source.rngForSeat(seat)());
  });
});
